/**
 * tasks-sync.js — shared task auto-assignment + Supabase sync for brand dashboards.
 *
 * Usage (after supabase-js CDN is loaded):
 *   <script src="/tasks-sync.js"></script>
 *   <script>
 *     window.TasksSync.init({ brand: 'faithdrive' });
 *   </script>
 *
 * Scans .stap and .check-item elements, auto-assigns to the best-matching
 * team member based on skills, upserts to Supabase, and hooks up checkbox
 * persistence via the 'tasks' table (with realtime broadcast).
 */
(function () {
  const SUPA_URL = 'https://uyxfyywjhblnivihnsxq.supabase.co';
  const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5eGZ5eXdqaGJsbml2aWhuc3hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5OTkyMzAsImV4cCI6MjA5MTU3NTIzMH0.1qVymlD2iqJCx5JX8HnN5G2tj2naDlptv7cMNIwxtIk';

  const TEAM_MEMBERS = [
    {
      name: 'Lucas Vermaire',
      short: 'Lucas',
      color: '#FF6B35',
      skills: {
        'website': 10, 'webapp': 10, 'app': 7, 'dashboard': 10, 'code': 10,
        'development': 10, 'developer': 10, 'ontwikkelen': 9, 'ontwikkeling': 9,
        'frontend': 10, 'backend': 9, 'fullstack': 10, 'api': 9, 'database': 8,
        'supabase': 10, 'react': 10, 'javascript': 10, 'html': 9, 'css': 9,
        'shopify': 9, 'integratie': 8, 'automation': 9, 'automatisering': 9,
        'tooling': 10, 'tool': 8, 'systeem': 7, 'technisch': 9, 'bug': 10, 'fix': 8,
        'landingspagina': 9, 'formulier': 7, 'checkout': 7, 'e-commerce': 7,
        'ui': 9, 'ux': 9, 'interface': 9, 'webshop': 9, 'tracking': 8,
        'design': 6, 'ontwerp': 6, 'mockup': 7, 'prototype': 8, 'figma': 9,
        'branding': 4, 'brand': 3, 'logo': 4, 'huisstijl': 4,
      },
    },
    {
      name: 'Raymond Huissen',
      short: 'Raymond',
      color: '#FFB86B',
      skills: {
        'strategie': 10, 'strategisch': 10, 'merkstrategie': 10, 'positionering': 10,
        'richting': 8, 'visie': 9, 'merk': 9, 'brand': 7, 'branding': 9,
        'concept': 9, 'conceptueel': 9, 'creatief': 9, 'creative': 9, 'creatieve': 9,
        'campagne': 9, 'campaign': 9, 'storytelling': 9, 'narratief': 9,
        'identiteit': 10, 'huisstijl': 9, 'logo': 8, 'visueel': 9, 'visuele': 9,
        'moodboard': 9, 'art direction': 10, 'artdirection': 10, 'specification': 7,
        'kleur': 7, 'typografie': 8, 'illustratie': 7, 'fotografie': 6,
        'design': 9, 'ontwerp': 9, 'grafisch': 9, 'pantone': 9, 'verpakking': 6,
        'tender': 8, 'tendercards': 8, 'tender cards': 8, 'cards': 5,
      },
    },
    {
      name: 'Shihab Belhajji',
      short: 'Shihab',
      color: '#8BC34A',
      skills: {
        'sales': 10, 'verkoop': 10, 'klant': 10, 'klanten': 10, 'klantcontact': 10,
        'lead': 9, 'leads': 9, 'conversie': 8, 'deal': 9, 'offerte': 9, 'quote': 8,
        'relatie': 9, 'relaties': 9, 'b2b': 9, 'outreach': 9,
        'acquisitie': 10, 'pitch': 8, 'presentatie': 7, 'meeting': 7, 'afspraak': 7,
        'productie': 10, 'produceren': 10, 'fulfillment': 10, 'verzending': 10,
        'logistiek': 10, 'voorraad': 10, 'inventory': 10, 'leverancier': 10,
        'supplier': 10, 'inkoop': 9, 'bestelling': 9, 'order': 8, 'orders': 8,
        'verpakking': 9, 'packaging': 9, 'shipping': 10, 'alibaba': 10,
        'operations': 10, 'operationeel': 10, 'proces': 8, 'workflow': 7,
        'qc': 9, 'inspectie': 9, 'qima': 10, 'sample': 8, 'samples': 8,
        'pilot': 8, 'mkb': 9, 'benader': 9,
      },
    },
  ];

  function score(text) {
    const lower = text.toLowerCase();
    return TEAM_MEMBERS.map((m) => {
      let pts = 0;
      const matched = [];
      Object.entries(m.skills).forEach(([kw, w]) => {
        const rx = new RegExp('\\b' + kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
        if (rx.test(lower)) { pts += w; matched.push(kw); }
      });
      return { ...m, score: pts, matched };
    }).sort((a, b) => b.score - a.score);
  }

  function assign(text) {
    const ranked = score(text);
    const total = ranked.reduce((s, m) => s + m.score, 0);
    if (total === 0) return { assigned_to: 'Gezamenlijk', reason: 'Geen specifieke skill-match' };
    const [first, second] = ranked;
    const topShare = first.score / total;
    if (topShare < 0.55 && second && second.score >= 5) {
      return {
        assigned_to: `${first.short} + ${second.short}`,
        reason: `${first.short}: ${first.matched.slice(0, 2).join(', ')} · ${second.short}: ${second.matched.slice(0, 2).join(', ')}`,
      };
    }
    return {
      assigned_to: first.short,
      reason: first.matched.slice(0, 3).join(', ') || 'Beste algemene match',
    };
  }

  function slug(s) {
    return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  }

  function colorFor(shortName) {
    const m = TEAM_MEMBERS.find((x) => x.short === shortName);
    return m ? m.color : '#6E6E72';
  }

  function pickBadgeColor(assigned) {
    if (!assigned || assigned === 'Gezamenlijk') return '#6E6E72';
    const first = assigned.split(/\s*\+\s*/)[0];
    return colorFor(first);
  }

  function badgeHtml(task) {
    const color = pickBadgeColor(task.assigned_to);
    const initials = (task.assigned_to || '?').split(/\s*\+\s*/).map(s => s.charAt(0)).join('');
    return `<span class="task-assignee" data-task-id="${task.id}" title="${task.assigned_to || 'Gezamenlijk'} — ${task.assigned_reason || ''}" style="display:inline-flex;align-items:center;gap:0.35rem;padding:0.15rem 0.55rem;border-radius:999px;background:${color}1A;border:1px solid ${color}40;color:${color};font-size:0.62rem;font-weight:600;letter-spacing:0.04em;white-space:nowrap;margin-left:0.5rem;">
      <span style="width:14px;height:14px;border-radius:50%;background:${color};color:#000;display:inline-flex;align-items:center;justify-content:center;font-size:0.55rem;font-weight:700;">${initials}</span>
      ${task.assigned_to || 'Gezamenlijk'}
    </span>`;
  }

  async function init(opts) {
    const brand = opts.brand;
    if (!brand) { console.error('TasksSync.init: brand required'); return; }
    if (!window.supabase) { console.error('TasksSync.init: supabase-js not loaded'); return; }
    const supa = window.supabase.createClient(SUPA_URL, SUPA_KEY);
    const channel = supa.channel('tasks_' + brand);

    // 1. Scan DOM for tasks
    const scanned = [];

    // Stappenplan items (.stap)
    document.querySelectorAll('.stap').forEach((el) => {
      if (el.classList.contains('warning') || el.classList.contains('tip')) return;
      const body = el.querySelector('.stap-body');
      if (!body) return;
      const h = body.querySelector('h4');
      const p = body.querySelector('p');
      const title = (h?.textContent || '').trim();
      const desc = (p?.textContent || '').trim();
      if (!title) return;
      const key = slug(title);
      const { assigned_to, reason } = assign(title + ' ' + desc);
      scanned.push({ el, source: 'stappenplan', task_key: key, title, description: desc, assigned_to, assigned_reason: reason });
    });

    // Checklist items (.check-item)
    document.querySelectorAll('.check-item').forEach((el) => {
      const text = (el.querySelector('.check-text')?.textContent || '').trim();
      const sub = (el.querySelector('.check-sub')?.textContent || '').trim();
      if (!text) return;
      const key = slug(text);
      const { assigned_to, reason } = assign(text + ' ' + sub);
      scanned.push({ el, source: 'checklist', task_key: key, title: text, description: sub, assigned_to, assigned_reason: reason });
    });

    if (scanned.length === 0) return;

    // 2. Upsert to Supabase
    const upsertPayload = scanned.map((t) => ({
      brand,
      source: t.source,
      task_key: t.task_key,
      title: t.title,
      description: t.description,
      assigned_to: t.assigned_to,
      assigned_reason: t.assigned_reason,
    }));

    const { error: upsertError } = await supa
      .from('tasks')
      .upsert(upsertPayload, { onConflict: 'brand,source,task_key', ignoreDuplicates: false });
    if (upsertError) {
      console.error('TasksSync upsert failed', upsertError);
      return;
    }

    // 3. Fetch task IDs + current status back
    const { data: dbTasks } = await supa
      .from('tasks')
      .select('id, source, task_key, assigned_to, assigned_reason, status')
      .eq('brand', brand);
    const keyMap = {};
    (dbTasks || []).forEach((t) => { keyMap[t.source + ':' + t.task_key] = t; });

    // 4. Render badges + restore state + hook clicks
    scanned.forEach((t) => {
      const db = keyMap[t.source + ':' + t.task_key];
      if (!db) return;

      if (t.source === 'stappenplan') {
        // Append badge next to the h4 title
        const h = t.el.querySelector('.stap-body h4');
        if (h && !h.querySelector('.task-assignee')) {
          h.insertAdjacentHTML('beforeend', badgeHtml(db));
        }
      } else if (t.source === 'checklist') {
        // Replace .check-text with itself + badge (but avoid duplicate)
        const textDiv = t.el.querySelector('.check-text');
        if (textDiv && !textDiv.parentElement.querySelector('.task-assignee')) {
          textDiv.insertAdjacentHTML('afterend', badgeHtml(db));
        }
        // Restore checked state
        if (db.status === 'done' && !t.el.classList.contains('done')) {
          t.el.classList.add('done');
          const num = t.el.querySelector('.stap-num');
          if (num) num.textContent = '✓';
        }
        // Rebind click (override any existing onclick=toggleCheck)
        t.el.removeAttribute('onclick');
        t.el.onclick = async (e) => {
          e.preventDefault();
          const willBeDone = !t.el.classList.contains('done');
          t.el.classList.toggle('done');
          const num = t.el.querySelector('.stap-num');
          if (num) num.textContent = willBeDone ? '✓' : (num.dataset.original || '');
          // Trigger dashboard-specific progress updates if defined
          if (typeof window.updateProgress === 'function') { try { window.updateProgress(); } catch (e) {} }
          const who = (localStorage.getItem('synergo_user_name') || '').trim();
          await supa.from('tasks').update({
            status: willBeDone ? 'done' : 'open',
            completed_at: willBeDone ? new Date().toISOString() : null,
            completed_by: willBeDone ? (who || null) : null,
          }).eq('id', db.id);
          channel.send({ type: 'broadcast', event: 'tasks_changed', payload: {} });
        };
      }
    });

    // Also restore .stap completed state for stappenplan items
    scanned.forEach((t) => {
      if (t.source !== 'stappenplan') return;
      const db = keyMap[t.source + ':' + t.task_key];
      if (!db) return;
      if (db.status === 'done') {
        t.el.style.opacity = '0.55';
        const num = t.el.querySelector('.stap-num');
        if (num && !num.querySelector('.done-check')) {
          num.innerHTML = '<span class="done-check" style="color:#4CAF7D;">✓</span>';
        }
      }
    });

    // Kick initial progress calc
    if (typeof window.updateProgress === 'function') { try { window.updateProgress(); } catch (e) {} }

    // 5. Subscribe for live updates from other clients
    channel.on('broadcast', { event: 'tasks_changed' }, async () => {
      const { data: fresh } = await supa
        .from('tasks')
        .select('id, source, task_key, status')
        .eq('brand', brand);
      (fresh || []).forEach((f) => {
        const t = scanned.find((s) => s.source === f.source && s.task_key === f.task_key);
        if (!t) return;
        if (f.source === 'checklist') {
          if (f.status === 'done') t.el.classList.add('done');
          else t.el.classList.remove('done');
        } else if (f.source === 'stappenplan') {
          t.el.style.opacity = f.status === 'done' ? '0.55' : '1';
        }
      });
      if (typeof window.updateProgress === 'function') { try { window.updateProgress(); } catch (e) {} }
    }).subscribe();
  }

  window.TasksSync = { init };
})();
