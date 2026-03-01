/**
 * QuickPollsPanel - In-class quick polling tool
 *
 * Standalone panel following the compound pattern.
 * Lecturers create polls (MCQ, Likert, open-ended, word cloud), collect
 * responses, and view live result visualizations. Polls are stored locally
 * and can be archived, exported, and reused across sessions.
 *
 * Usage:
 *   const panel = new QuickPollsPanel({ courseCode: 'MGAB401' });
 *   panel.render(controlEl, stageEl);
 */
class QuickPollsPanel {

    constructor(config = {}) {
        this.courseCode = config.courseCode || 'COMP101';

        // Poll state
        this._polls = [];        // All polls
        this._activePoll = null; // Currently displayed poll
        this._nextId = 1;

        // Bus
        this._bus = null;

        // UI refs
        this._controlEl = null;
        this._stageEl = null;
        this._inputs = {};
        this._accordion = null;
        this._stageContent = null;

        // Question type definitions
        this._questionTypes = {
            mcq:       { label: 'Multiple Choice', icon: 'fa-list-ol', defaultOptions: ['Option A', 'Option B', 'Option C', 'Option D'] },
            likert:    { label: 'Likert Scale', icon: 'fa-sliders-h', defaultOptions: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'] },
            openEnded: { label: 'Open-Ended', icon: 'fa-comment-dots', defaultOptions: [] },
            wordCloud: { label: 'Word Cloud', icon: 'fa-cloud', defaultOptions: [] }
        };
    }

    // ── Publome / UIBinding ─────────────────────────────────────────────

    setPublome(publome) {
        this._publome = publome;
    }

    _bindKPIs(container, stats) {
        var miniPublome = new Publome({
            tables: [{ name: 'metric', columns: {
                idx: { type: 'number', primaryKey: true },
                code: { type: 'string' },
                value: { type: 'string' },
                label: { type: 'string' },
                icon: { type: 'string' },
                color: { type: 'string' }
            }}]
        });
        stats.forEach(function(s, i) {
            miniPublome.table('metric').create({ idx: i + 1, code: s.code || s.label, value: String(s.value), label: s.label, icon: s.icon, color: s.color });
        });

        stats.forEach(function(s) {
            var el = document.createElement('div');
            container.appendChild(el);
            var binding = new UIBinding(miniPublome.table('metric'), { publome: miniPublome });
            binding.bindMetric(el, {
                compute: function(records) {
                    var r = records.find(function(rec) { return rec.get('code') === (s.code || s.label); });
                    return r ? r.get('value') : '\u2014';
                },
                label: s.label,
                icon: s.icon || '',
                color: s.color || 'var(--ui-primary)'
            });
        });
    }

    // ── Public API ──────────────────────────────────────────────────────────

    connectBus(bus) {
        this._bus = bus;
        bus.on('load', params => this.load(params));
        return this;
    }

    async load(params = {}) {
        if (params.courseCode !== undefined) this.courseCode = params.courseCode;
        if (this._bus) this._bus.emit('panelStatus', { key: 'polls', status: 'loading' });
        // Update course display if already rendered
        if (this._controlEl) {
            var badge = this._controlEl.querySelector('.ui-badge');
            if (badge) badge.textContent = this.courseCode;
        }
        if (this._bus) this._bus.emit('panelStatus', { key: 'polls', status: 'done' });
    }

    render(controlEl, stageEl) {
        this._controlEl = controlEl;
        this._stageEl = stageEl;
        this._buildAccordion();
        this._renderEmptyStage();
    }

    // ── Controls ────────────────────────────────────────────────────────────

    _buildAccordion() {
        const el = this._controlEl;
        el.innerHTML = '';

        const content = {
            create: { label: '<i class="fas fa-plus-circle" style="margin-right:0.3rem;"></i>Create Poll', open: true },
            archive: { label: '<i class="fas fa-archive" style="margin-right:0.3rem;"></i>Poll Archive' }
        };

        const accordion = new uiAccordion({
            exclusive: true,
            content,
            parent: el
        });
        this._accordion = accordion;

        const createEl = accordion.el.querySelector('.ui-accordion-item[data-key="create"] .ui-accordion-content');
        this._renderCreateForm(createEl);

        this._archiveEl = accordion.el.querySelector('.ui-accordion-item[data-key="archive"] .ui-accordion-content');
        this._renderArchiveList();
    }

    _renderCreateForm(el) {
        el.innerHTML = '';

        // Course code display
        const courseRow = document.createElement('div');
        courseRow.className = 'as-ctrl-row';
        el.appendChild(courseRow);

        const courseLabel = document.createElement('label');
        courseLabel.className = 'qp-ctrl-label';
        courseLabel.textContent = 'Course';
        courseRow.appendChild(courseLabel);

        new uiBadge({ label: this.courseCode, color: 'primary', size: 'sm', parent: courseRow });

        // Question text
        this._inputs.question = new uiInput({
            template: 'inline-label', label: 'Question',
            value: '', placeholder: 'Enter your poll question...', size: 'sm', parent: el
        });

        // Question type selector
        const typeRow = document.createElement('div');
        typeRow.className = 'as-ctrl-row';
        el.appendChild(typeRow);

        const typeLabel = document.createElement('label');
        typeLabel.className = 'qp-ctrl-label';
        typeLabel.textContent = 'Type';
        typeRow.appendChild(typeLabel);

        this._typeSelect = document.createElement('select');
        this._typeSelect.className = 'ui-select qp-select-full';
        Object.entries(this._questionTypes).forEach(([key, def]) => {
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = def.label;
            this._typeSelect.appendChild(opt);
        });
        this._typeSelect.addEventListener('change', () => this._updateOptionsPreview());
        typeRow.appendChild(this._typeSelect);

        // Options area (for MCQ / Likert — editable)
        this._optionsArea = document.createElement('div');
        this._optionsArea.className = 'as-ctrl-row';
        el.appendChild(this._optionsArea);
        this._updateOptionsPreview();

        // Anonymous toggle
        const anonRow = document.createElement('div');
        anonRow.className = 'qp-anon-row';
        el.appendChild(anonRow);

        this._anonCheck = document.createElement('input');
        this._anonCheck.type = 'checkbox';
        this._anonCheck.checked = true;
        this._anonCheck.id = 'qp-anon';
        anonRow.appendChild(this._anonCheck);

        const anonLabel = document.createElement('label');
        anonLabel.htmlFor = 'qp-anon';
        anonLabel.className = 'qp-anon-label';
        anonLabel.textContent = 'Anonymous responses';
        anonRow.appendChild(anonLabel);

        // Buttons
        const btnRow = document.createElement('div');
        btnRow.className = 'qp-btn-row';
        el.appendChild(btnRow);

        new uiButton({
            label: 'Create & Launch', variant: 'primary', size: 'sm', parent: btnRow,
            onClick: () => this._createPoll()
        });

        new uiButton({
            label: 'Simulate', variant: 'ghost', size: 'sm', parent: btnRow,
            onClick: () => this._createAndSimulate()
        });
    }

    _updateOptionsPreview() {
        const type = this._typeSelect.value;
        const def = this._questionTypes[type];
        this._optionsArea.innerHTML = '';

        if (type === 'openEnded' || type === 'wordCloud') {
            const note = document.createElement('div');
            note.className = 'qp-note-italic';
            note.textContent = type === 'openEnded' ? 'Free-text responses will be collected.' : 'Single-word responses will form a word cloud.';
            this._optionsArea.appendChild(note);
            return;
        }

        const label = document.createElement('label');
        label.className = 'qp-options-label';
        label.textContent = 'Options (one per line)';
        this._optionsArea.appendChild(label);

        this._optionsTextarea = document.createElement('textarea');
        this._optionsTextarea.className = 'ui-input qp-textarea-full';
        this._optionsTextarea.rows = 4;
        this._optionsTextarea.value = def.defaultOptions.join('\n');
        this._optionsArea.appendChild(this._optionsTextarea);
    }

    _getQuestionText() {
        const inputEl = this._inputs.question.el.querySelector('input') || this._inputs.question.el;
        return inputEl.value.trim();
    }

    _getOptions() {
        const type = this._typeSelect.value;
        if (type === 'openEnded' || type === 'wordCloud') return [];
        if (!this._optionsTextarea) return [];
        return this._optionsTextarea.value.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    }

    // ── Poll Creation ───────────────────────────────────────────────────────

    _createPoll() {
        const question = this._getQuestionText();
        if (!question) return;

        const type = this._typeSelect.value;
        const options = this._getOptions();

        if ((type === 'mcq' || type === 'likert') && options.length < 2) return;

        const poll = {
            id: this._nextId++,
            question,
            type,
            typeDef: this._questionTypes[type],
            options,
            anonymous: this._anonCheck.checked,
            course: this.courseCode,
            createdAt: new Date(),
            status: 'active',
            responses: []
        };

        this._polls.unshift(poll);
        this._activePoll = poll;
        this._renderPollStage(poll);
        this._renderArchiveList();
    }

    _createAndSimulate() {
        this._createPoll();
        if (this._activePoll) {
            this._simulateResponses(this._activePoll, 30 + Math.floor(Math.random() * 40));
            this._renderPollStage(this._activePoll);
        }
    }

    _simulateResponses(poll, count) {
        const names = ['Sipho M.', 'Thandi N.', 'James K.', 'Priya D.', 'Ahmed R.',
            'Zanele T.', 'David L.', 'Nkosi B.', 'Sarah J.', 'Thabo S.',
            'Mbali W.', 'Raj P.', 'Lerato M.', 'Chris A.', 'Nomsa G.',
            'Ethan C.', 'Zinhle D.', 'Bongani F.', 'Jessica H.', 'Mandla K.',
            'Fatima Z.', 'Liam O.', 'Nandi P.', 'Oliver Q.', 'Palesa R.',
            'Quinn S.', 'Ravi T.', 'Sana U.', 'Tom V.', 'Uma W.',
            'Victor X.', 'Wanda Y.', 'Xander Z.', 'Yusuf A.', 'Zara B.',
            'Ayanda C.', 'Brett D.', 'Candice E.', 'Derek F.', 'Emma G.',
            'Frank H.', 'Grace I.', 'Hector J.', 'Isla K.', 'John L.',
            'Karen M.', 'Leo N.', 'Mia O.', 'Noah P.', 'Olivia Q.'];

        const openPhrases = [
            'Very helpful, thank you', 'Could use more examples', 'Good lecture',
            'Too fast paced', 'Need more practice problems', 'Excellent explanation',
            'I was confused about the last part', 'Clear and concise', 'Well structured',
            'Would prefer more visuals', 'Great session', 'Needs improvement',
            'More group work please', 'The examples were relevant', 'I enjoyed this',
            'Please slow down', 'The tutorial was useful', 'Not enough time for questions'
        ];

        const wordCloudWords = [
            'helpful', 'confusing', 'interesting', 'boring', 'clear', 'fast', 'slow',
            'engaging', 'practical', 'theoretical', 'fun', 'difficult', 'easy',
            'relevant', 'motivating', 'challenging', 'supportive', 'informative',
            'interactive', 'intense', 'rewarding', 'stressful', 'excellent', 'good',
            'great', 'okay', 'poor', 'average', 'inspiring', 'tough'
        ];

        for (let i = 0; i < count; i++) {
            let value;
            if (poll.type === 'mcq' || poll.type === 'likert') {
                // Weighted distribution — bias toward middle for Likert, more spread for MCQ
                if (poll.type === 'likert') {
                    const weights = [0.08, 0.15, 0.3, 0.32, 0.15];
                    value = this._weightedPick(poll.options, weights);
                } else {
                    value = poll.options[Math.floor(Math.random() * poll.options.length)];
                }
            } else if (poll.type === 'openEnded') {
                value = openPhrases[Math.floor(Math.random() * openPhrases.length)];
            } else {
                // Word cloud — each respondent gives 1-3 words
                const wordCount = 1 + Math.floor(Math.random() * 3);
                const words = [];
                for (let w = 0; w < wordCount; w++) {
                    words.push(wordCloudWords[Math.floor(Math.random() * wordCloudWords.length)]);
                }
                value = words.join(', ');
            }

            poll.responses.push({
                respondent: poll.anonymous ? `Anon-${i + 1}` : names[i % names.length],
                value,
                timestamp: new Date(Date.now() - Math.random() * 600000)
            });
        }
    }

    _weightedPick(arr, weights) {
        const total = weights.reduce((s, w) => s + w, 0);
        let r = Math.random() * total;
        for (let i = 0; i < arr.length; i++) {
            r -= weights[i] || (total / arr.length);
            if (r <= 0) return arr[i];
        }
        return arr[arr.length - 1];
    }

    // ── Archive List ────────────────────────────────────────────────────────

    _renderArchiveList() {
        if (!this._archiveEl) return;
        this._archiveEl.innerHTML = '';

        if (this._polls.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'qp-empty-note';
            empty.textContent = 'No polls yet.';
            this._archiveEl.appendChild(empty);
            return;
        }

        // Build a mini Publome for the poll list
        const pollPublome = new Publome({
            tables: [{ name: 'pollItem', columns: {
                idx: { type: 'number', primaryKey: true },
                question: { type: 'string' },
                typeLabel: { type: 'string' },
                typeIcon: { type: 'string' },
                responseCount: { type: 'number' },
                status: { type: 'string' }
            }}]
        });
        this._polls.forEach((poll, i) => {
            pollPublome.table('pollItem').create({
                idx: i + 1, question: poll.question,
                typeLabel: poll.typeDef.label, typeIcon: poll.typeDef.icon,
                responseCount: poll.responses.length, status: poll.status
            });
        });

        const listEl = document.createElement('div');
        this._archiveEl.appendChild(listEl);

        const self = this;
        const pollBinding = new UIBinding(pollPublome.table('pollItem'), { publome: pollPublome });
        pollBinding.bindCollection(listEl, {
            component: 'card',
            map: function(record) {
                const pollIdx = record.get('idx') - 1;
                const poll = self._polls[pollIdx];
                const statusColor = poll.status === 'active' ? 'var(--ui-success)' : 'var(--ui-gray-500)';

                return {
                    title: poll.question,
                    subtitle: `${poll.typeDef.label} \u2022 ${poll.responses.length} responses`,
                    icon: poll.typeDef.icon,
                    badge: { label: poll.status === 'active' ? 'Active' : 'Closed', color: statusColor },
                    onClick: function() {
                        self._activePoll = poll;
                        self._renderPollStage(poll);
                    }
                };
            }
        });
    }

    // ── Empty Stage ─────────────────────────────────────────────────────────

    _renderEmptyStage() {
        this._stageEl.innerHTML = '';
        this._stageEl.className = 'as-panel-inner';

        new uiAlert({
            color: 'info',
            title: 'Quick Polls',
            message: 'Create a poll using the form on the left, or click "Simulate" to generate a poll with sample responses. Results will display here with live visualizations.',
            parent: this._stageEl
        });
    }

    // ── Poll Stage Renderer ─────────────────────────────────────────────────

    _renderPollStage(poll) {
        this._stageEl.innerHTML = '';
        this._stageEl.className = 'as-panel-stage-scroll';

        const wrap = document.createElement('div');
        wrap.className = 'as-panel-inner';
        this._stageEl.appendChild(wrap);

        // Poll header
        const header = document.createElement('div');
        header.className = 'qp-poll-header';
        wrap.appendChild(header);

        const qBlock = document.createElement('div');
        qBlock.className = 'qp-question-block';
        const statusBg = poll.status === 'active' ? 'var(--ui-success)' : 'var(--ui-gray-500)';
        qBlock.innerHTML = `
            <div class="qp-question-title">${this._esc(poll.question)}</div>
            <div class="qp-badge-row">
                <span class="qp-type-badge">${poll.typeDef.label}</span>
                <span class="qp-status-badge" style="background:${statusBg}">${poll.status === 'active' ? 'Active' : 'Closed'}</span>
                <span class="qp-meta-text">${poll.anonymous ? 'Anonymous' : 'Identified'} \u2022 ${poll.course}</span>
            </div>
        `;
        header.appendChild(qBlock);

        // Action buttons
        const actions = document.createElement('div');
        actions.className = 'qp-actions';
        header.appendChild(actions);

        if (poll.status === 'active') {
            new uiButton({
                label: 'Close Poll', variant: 'ghost', size: 'xs', parent: actions,
                onClick: () => { poll.status = 'closed'; this._renderPollStage(poll); this._renderArchiveList(); }
            });
        } else {
            new uiButton({
                label: 'Reopen', variant: 'ghost', size: 'xs', parent: actions,
                onClick: () => { poll.status = 'active'; this._renderPollStage(poll); this._renderArchiveList(); }
            });
        }

        new uiButton({
            label: '+10 Responses', variant: 'ghost', size: 'xs', parent: actions,
            onClick: () => { this._simulateResponses(poll, 10); this._renderPollStage(poll); this._renderArchiveList(); }
        });

        // KPI row
        this._renderPollKPIs(wrap, poll);

        // Results visualization
        if (poll.type === 'mcq' || poll.type === 'likert') {
            this._renderBarChart(wrap, poll);
            this._renderDonutChart(wrap, poll);
        } else if (poll.type === 'wordCloud') {
            this._renderWordCloud(wrap, poll);
        } else {
            this._renderOpenEndedResponses(wrap, poll);
        }

        // Response timeline
        this._renderResponseTable(wrap, poll);
    }

    // ── KPIs ────────────────────────────────────────────────────────────────

    _renderPollKPIs(container, poll) {
        const row = document.createElement('div');
        row.className = 'as-kpi-row';
        container.appendChild(row);

        const n = poll.responses.length;
        let topChoice = '\u2014', topPct = 0;

        if ((poll.type === 'mcq' || poll.type === 'likert') && n > 0) {
            const counts = {};
            poll.responses.forEach(r => { counts[r.value] = (counts[r.value] || 0) + 1; });
            const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
            topChoice = sorted[0][0];
            topPct = this._r(100 * sorted[0][1] / n);
        }

        let engagement = '\u2014';
        if (poll.type === 'likert' && n > 0) {
            const posMap = {};
            poll.options.forEach((opt, i) => { posMap[opt] = i + 1; });
            const avg = this._mean(poll.responses.map(r => posMap[r.value] || 3));
            engagement = `${this._r(avg)} / ${poll.options.length}`;
        }

        const uniqueRespondents = new Set(poll.responses.map(r => r.respondent)).size;

        const stats = [
            { icon: 'fa-reply-all', label: 'Responses', value: String(n), color: 'var(--ui-primary-900)' },
            { icon: 'fa-users', label: 'Respondents', value: String(uniqueRespondents), color: 'var(--ui-secondary)' },
            { icon: 'fa-star', label: 'Top Choice', value: topChoice, color: 'var(--ui-success)' },
            { icon: 'fa-clock', label: 'Status', value: poll.status === 'active' ? 'Live' : 'Closed', color: poll.status === 'active' ? 'var(--ui-success)' : 'var(--ui-gray-500)' }
        ];

        if (poll.type === 'likert') {
            stats.push({ icon: 'fa-thermometer-half', label: 'Avg Rating', value: engagement, color: '#d4af37' });
        }

        this._bindKPIs(row, stats);
    }

    // ── Bar Chart (MCQ / Likert) ────────────────────────────────────────────

    _renderBarChart(container, poll) {
        const title = document.createElement('div');
        title.className = 'qp-section-title';
        title.textContent = 'Response Distribution';
        container.appendChild(title);

        const n = poll.responses.length;
        if (n === 0) {
            container.appendChild(this._emptyNote('No responses yet.'));
            return;
        }

        // Count responses per option
        const counts = {};
        poll.options.forEach(opt => { counts[opt] = 0; });
        poll.responses.forEach(r => { counts[r.value] = (counts[r.value] || 0) + 1; });

        const maxCount = Math.max(...Object.values(counts), 1);
        const opts = poll.options;

        const barColors = ['var(--ui-primary-900)', 'var(--ui-success)', '#d4af37', 'var(--ui-info)', 'var(--ui-secondary)', 'var(--ui-warning)', 'var(--ui-danger)', 'var(--ui-gray-500)'];

        const W = 460, rowH = 32;
        const H = opts.length * rowH + 30;
        const pad = { left: 120, right: 60, top: 10, bottom: 10 };
        const cW = W - pad.left - pad.right;

        let svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%; max-width:460px; height:auto; display:block;">`;

        opts.forEach((opt, i) => {
            const count = counts[opt] || 0;
            const pct = n > 0 ? (count / n) : 0;
            const y = pad.top + i * rowH;
            const barW = pct * cW;
            const color = barColors[i % barColors.length];

            // Label
            const labelText = opt.length > 18 ? opt.substring(0, 18) + '\u2026' : opt;
            svg += `<text x="${pad.left - 6}" y="${y + rowH / 2 + 3}" font-size="9" fill="#374151" text-anchor="end">${this._esc(labelText)}</text>`;

            // Bar
            svg += `<rect x="${pad.left}" y="${y + 4}" width="${barW}" height="${rowH - 8}" fill="${color}" opacity="0.8" rx="3"/>`;

            // Count + percentage label
            svg += `<text x="${pad.left + barW + 5}" y="${y + rowH / 2 + 3}" font-size="9" fill="${color}" font-weight="600">${count} (${this._r(pct * 100)}%)</text>`;
        });

        svg += '</svg>';

        const el = document.createElement('div');
        el.className = 'qp-bar-chart-wrap';
        el.innerHTML = svg;
        container.appendChild(el);
    }

    // ── Donut Chart (MCQ / Likert) ──────────────────────────────────────────

    _renderDonutChart(container, poll) {
        const n = poll.responses.length;
        if (n === 0) return;

        const counts = {};
        poll.options.forEach(opt => { counts[opt] = 0; });
        poll.responses.forEach(r => { counts[r.value] = (counts[r.value] || 0) + 1; });

        const barColors = ['var(--ui-primary-900)', 'var(--ui-success)', '#d4af37', 'var(--ui-info)', 'var(--ui-secondary)', 'var(--ui-warning)', 'var(--ui-danger)', 'var(--ui-gray-500)'];
        const segments = poll.options.map((opt, i) => ({
            label: opt, count: counts[opt] || 0, color: barColors[i % barColors.length]
        })).filter(s => s.count > 0);

        const W = 200, H = 200;
        const cx = W / 2, cy = H / 2;
        const outerR = 80, innerR = 48;

        let svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%; max-width:200px; height:auto; display:block; margin:0 auto;">`;

        let startAngle = -Math.PI / 2;
        segments.forEach(seg => {
            const frac = seg.count / n;
            const endAngle = startAngle + frac * 2 * Math.PI;

            const x1 = cx + outerR * Math.cos(startAngle);
            const y1 = cy + outerR * Math.sin(startAngle);
            const x2 = cx + outerR * Math.cos(endAngle);
            const y2 = cy + outerR * Math.sin(endAngle);
            const ix1 = cx + innerR * Math.cos(endAngle);
            const iy1 = cy + innerR * Math.sin(endAngle);
            const ix2 = cx + innerR * Math.cos(startAngle);
            const iy2 = cy + innerR * Math.sin(startAngle);

            const largeArc = frac > 0.5 ? 1 : 0;

            const d = [
                `M ${x1} ${y1}`,
                `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2}`,
                `L ${ix1} ${iy1}`,
                `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2}`,
                'Z'
            ].join(' ');

            svg += `<path d="${d}" fill="${seg.color}" opacity="0.85"/>`;
            startAngle = endAngle;
        });

        svg += `<text x="${cx}" y="${cy - 2}" font-size="20" font-weight="700" fill="var(--ui-gray-800)" text-anchor="middle">${n}</text>`;
        svg += `<text x="${cx}" y="${cy + 12}" font-size="8" fill="var(--ui-gray-500)" text-anchor="middle">responses</text>`;
        svg += '</svg>';

        // Wrap with legend
        const chartRow = document.createElement('div');
        chartRow.className = 'qp-chart-row';
        container.appendChild(chartRow);

        const donutEl = document.createElement('div');
        donutEl.innerHTML = svg;
        chartRow.appendChild(donutEl);

        const legend = document.createElement('div');
        legend.className = 'qp-legend';
        segments.forEach(seg => {
            const pct = this._r(100 * seg.count / n);
            legend.innerHTML += `<span class="qp-legend-item">
                <span class="qp-legend-swatch" style="background:${seg.color}"></span>
                <span class="qp-legend-label">${this._esc(seg.label)}</span>
                <span class="qp-legend-count">${seg.count} (${pct}%)</span>
            </span>`;
        });
        chartRow.appendChild(legend);
    }

    // ── Word Cloud ──────────────────────────────────────────────────────────

    _renderWordCloud(container, poll) {
        const title = document.createElement('div');
        title.className = 'qp-section-title';
        title.textContent = 'Word Cloud';
        container.appendChild(title);

        if (poll.responses.length === 0) {
            container.appendChild(this._emptyNote('No responses yet.'));
            return;
        }

        // Count words
        const wordCounts = {};
        poll.responses.forEach(r => {
            const words = r.value.split(/[,\s]+/).map(w => w.toLowerCase().trim()).filter(w => w.length > 1);
            words.forEach(w => { wordCounts[w] = (wordCounts[w] || 0) + 1; });
        });

        const sorted = Object.entries(wordCounts).sort((a, b) => b[1] - a[1]);
        const maxCount = sorted.length > 0 ? sorted[0][1] : 1;

        const cloudColors = ['var(--ui-primary-900)', 'var(--ui-success)', '#d4af37', 'var(--ui-info)', 'var(--ui-secondary)', 'var(--ui-warning)', 'var(--ui-danger)', 'var(--ui-gray-500)'];

        const cloudEl = document.createElement('div');
        cloudEl.className = 'qp-word-cloud';

        sorted.slice(0, 40).forEach(([word, count], i) => {
            const scale = 0.7 + (count / maxCount) * 1.8;
            const color = cloudColors[i % cloudColors.length];
            const opacity = 0.5 + (count / maxCount) * 0.5;

            const span = document.createElement('span');
            span.style.cssText = `font-size:${scale}rem; color:${color}; opacity:${opacity}; font-weight:${count >= maxCount * 0.7 ? '700' : count >= maxCount * 0.4 ? '600' : '400'}; padding:0.1rem 0.3rem; cursor:default; transition:transform 0.15s;`;
            span.textContent = word;
            span.title = `"${word}" — ${count} mentions`;
            span.addEventListener('mouseenter', () => { span.style.transform = 'scale(1.15)'; });
            span.addEventListener('mouseleave', () => { span.style.transform = 'scale(1)'; });
            cloudEl.appendChild(span);
        });

        container.appendChild(cloudEl);

        // Top words table
        if (sorted.length > 0) {
            const topTitle = document.createElement('div');
            topTitle.className = 'qp-section-title';
            topTitle.textContent = 'Top Words';
            container.appendChild(topTitle);

            const table = document.createElement('table');
            table.className = 'qp-word-table';

            const thead = document.createElement('thead');
            thead.innerHTML = '<tr><th>Word</th><th>Count</th><th>%</th><th>Frequency</th></tr>';
            table.appendChild(thead);

            const tbody = document.createElement('tbody');
            sorted.slice(0, 15).forEach(([word, count]) => {
                const pct = this._r(100 * count / poll.responses.length);
                const barPct = (count / maxCount) * 100;
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${this._esc(word)}</td>
                    <td>${count}</td>
                    <td>${pct}%</td>
                    <td>
                        <div class="qp-freq-bar-bg">
                            <div class="qp-freq-bar-fill" style="width:${barPct}%"></div>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);
            container.appendChild(table);
        }
    }

    // ── Open-Ended Responses ────────────────────────────────────────────────

    _renderOpenEndedResponses(container, poll) {
        const title = document.createElement('div');
        title.className = 'qp-section-title';
        title.textContent = 'Responses';
        container.appendChild(title);

        if (poll.responses.length === 0) {
            container.appendChild(this._emptyNote('No responses yet.'));
            return;
        }

        // Sentiment-like grouping by length/keywords (simple heuristic)
        const responses = [...poll.responses].sort((a, b) => b.timestamp - a.timestamp);

        const listEl = document.createElement('div');
        listEl.className = 'qp-response-list';
        container.appendChild(listEl);

        responses.forEach((r, i) => {
            const card = document.createElement('div');
            card.className = 'qp-response-card';

            const text = document.createElement('div');
            text.className = 'qp-response-text';
            text.textContent = r.value;
            card.appendChild(text);

            const meta = document.createElement('div');
            meta.className = 'qp-response-meta';
            meta.textContent = `${r.respondent} \u2022 ${r.timestamp.toLocaleTimeString()}`;
            card.appendChild(meta);

            listEl.appendChild(card);
        });

        // Theme summary (simple keyword frequency)
        const allText = responses.map(r => r.value.toLowerCase()).join(' ');
        const stopWords = new Set(['the', 'a', 'an', 'is', 'was', 'i', 'it', 'to', 'and', 'of', 'in', 'for', 'this', 'that', 'with', 'on', 'at', 'be', 'not', 'but']);
        const words = allText.split(/\W+/).filter(w => w.length > 2 && !stopWords.has(w));
        const freq = {};
        words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
        const topThemes = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 8);

        if (topThemes.length > 0) {
            const themeTitle = document.createElement('div');
            themeTitle.className = 'qp-section-title';
            themeTitle.textContent = 'Key Themes';
            container.appendChild(themeTitle);

            const themeRow = document.createElement('div');
            themeRow.className = 'qp-theme-row';
            topThemes.forEach(([word, count]) => {
                const badge = document.createElement('span');
                badge.className = 'qp-theme-badge';
                badge.textContent = `${word} (${count})`;
                themeRow.appendChild(badge);
            });
            container.appendChild(themeRow);
        }
    }

    // ── Response Table ──────────────────────────────────────────────────────

    _renderResponseTable(container, poll) {
        if (poll.responses.length === 0) return;

        const title = document.createElement('div');
        title.className = 'qp-section-title';
        title.textContent = 'All Responses';
        container.appendChild(title);

        const tableWrap = document.createElement('div');
        tableWrap.className = 'qp-table-wrap';
        container.appendChild(tableWrap);

        const columns = [
            { key: 'respondent', label: 'Respondent' },
            { key: 'value', label: 'Response' },
            { key: 'time', label: 'Time' }
        ];

        const data = poll.responses.map(r => ({
            respondent: r.respondent,
            value: r.value,
            time: r.timestamp.toLocaleTimeString()
        }));

        new uiTable({
            template: 'compact',
            columns,
            data,
            paging: true,
            pageLength: 10,
            searching: true,
            ordering: true,
            parent: tableWrap
        });
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    _mean(arr) {
        if (arr.length === 0) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }

    _r(v) { return Math.round(v * 10) / 10; }

    _esc(str) {
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    _emptyNote(text) {
        const el = document.createElement('div');
        el.className = 'qp-empty-stage-note';
        el.textContent = text;
        return el;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QuickPollsPanel;
}
if (typeof window !== 'undefined') {
    window.QuickPollsPanel = QuickPollsPanel;
}
if (typeof ClassViewConnect !== 'undefined') {
    ClassViewConnect.registerPanel('QuickPollsPanel', QuickPollsPanel);
}
