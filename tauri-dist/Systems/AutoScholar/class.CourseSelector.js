/**
 * CourseSelector - Reusable course picker modal
 * Shows course code, label, credits, and student count
 * Supports search/filter, multi-select, loading states, and keyboard navigation
 *
 * Extends BaseSelector for standardized selector behavior
 */
class CourseSelector extends BaseSelector {
    constructor(settings = {}) {
        // Map course-specific settings to base settings
        super({
            ...settings,
            items: settings.courses || settings.items || [],
            selected: settings.selected || null,
            selectedItems: settings.selectedCourses || settings.selectedItems || [],
            title: settings.title || 'My Courses',
            searchPlaceholder: 'Search courses...',
            emptyMessage: 'No courses found',
            itemLabel: 'courses',
            searchContext: 'courses',
            minSearchLength: settings.minSearchLength !== undefined ? settings.minSearchLength : 2
        });

        // Backward compatibility: expose courses property
        this._courses = this.items;

        // Mode state: 'popular' | 'search' | 'browse'
        this._activeMode = 'popular';
        this._facultyLabels = settings.facultyLabels || {};
        this._disciplineLabels = settings.disciplineLabels || {};
        this._browseAreaEl = null;
        this._browseTree = null;
        this._browseTreeContainerEl = null;

        // Popular mode state
        this._year = settings.year || new Date().getFullYear();
        this._yearRange = settings.yearRange || null;
        this._onYearChange = settings.onYearChange || null;
        this._onEnrichPage = settings.onEnrichPage || null;
        this._enrichedCodes = {};  // track which codes have been enriched
        this._popularContainerEl = null;
        this._popularListEl = null;
        this._popularPage = 1;
        this._popularPageSize = 10;
        this._popularFilter = '';
    }

    // Backward compatibility getters/setters
    get courses() { return this.items; }
    set courses(val) { this.items = val; this._courses = val; }

    get selectedCourse() { return this.selectedItem; }
    set selectedCourse(val) { this.selectedItem = val; }

    /**
     * Set courses to display (backward compatible)
     */
    setCourses(courses) {
        this.setItems(courses);
        this._courses = courses;
    }

    /**
     * Override open to add accessibility enhancements
     */
    open() {
        super.open();

        // Register modal with accessibility manager for focus trap and Escape key
        if (typeof AutoScholarA11y !== 'undefined' && this.modal) {
            AutoScholarA11y.setActiveModal(this.modal);
        }

        // Default to popular mode
        if (this._browseAreaEl) {
            this._setMode('popular');
        }
    }

    /**
     * Render mode toggle area + containers for popular and browse
     */
    _renderBrowseArea(body) {
        var hasFacultyData = this.items.some(function(c) { return c.facultyCode; });

        this._browseAreaEl = document.createElement('div');
        this._browseAreaEl.className = 'as-mb-2';
        (body.domElement || body).appendChild(this._browseAreaEl);

        // Toggle row: Popular | Search | Browse
        this._toggleRow = document.createElement('div');
        this._toggleRow.className = 'as-flex-row as-mb-2';
        this._browseAreaEl.appendChild(this._toggleRow);

        var self = this;
        var modes = ['Popular', 'Search'];
        if (hasFacultyData) modes.push('Browse');

        modes.forEach(function(mode) {
            var btn = document.createElement('button');
            btn.textContent = mode;
            btn.setAttribute('data-mode', mode.toLowerCase());
            btn.className = 'as-toggle-btn';
            btn.addEventListener('click', function() {
                self._setMode(mode.toLowerCase());
            });
            self._toggleRow.appendChild(btn);
        });

        // Popular mode container (hidden by default, shown when mode=popular)
        this._popularContainerEl = document.createElement('div');
        this._popularContainerEl.classList.add('as-hidden');
        this._browseAreaEl.appendChild(this._popularContainerEl);

        // Browse tree container (hidden by default)
        this._browseTreeContainerEl = document.createElement('div');
        this._browseTreeContainerEl.className = 'as-scrollable as-hidden as-list-scroll';
        this._browseAreaEl.appendChild(this._browseTreeContainerEl);
    }

    /**
     * Switch between modes: popular, search, browse
     */
    _setMode(mode) {
        this._activeMode = mode;

        // Clear search
        this.currentSearchTerm = '';
        this._popularFilter = '';
        if (this.searchInput) {
            var inputEl = this.searchInput.domElement.tagName === 'INPUT'
                ? this.searchInput.domElement
                : this.searchInput.domElement.querySelector('input') || this.searchInput.domElement;
            inputEl.value = '';
        }

        // Update toggle button visuals
        var self = this;
        this._toggleRow.querySelectorAll('button').forEach(function(b) {
            var isActive = b.getAttribute('data-mode') === mode;
            b.className = isActive ? 'as-toggle-btn as-toggle-btn-active' : 'as-toggle-btn';
        });

        // Hide all containers
        if (this._popularContainerEl) this._popularContainerEl.classList.add('as-hidden');
        if (this._browseTreeContainerEl) this._browseTreeContainerEl.classList.add('as-hidden');
        if (this.itemList) this.itemList.domElement.classList.add('as-hidden');
        if (this.countInfo) this.countInfo.domElement.classList.add('as-hidden');

        // Show the active mode's container
        if (mode === 'popular') {
            if (this._popularContainerEl) this._popularContainerEl.classList.remove('as-hidden');
            this._renderPopularList();
        } else if (mode === 'browse') {
            if (this._browseTreeContainerEl) this._browseTreeContainerEl.classList.remove('as-hidden');
            this._renderBrowseTree();
        } else {
            // Search mode — show item list + count
            if (this.itemList) this.itemList.domElement.classList.remove('as-hidden');
            if (this.countInfo) this.countInfo.domElement.classList.remove('as-hidden');
            this._filterItems(this.currentSearchTerm);
        }

        // Hide base search input in popular mode (has its own filter)
        if (this.searchInput) {
            this.searchInput.domElement.classList.toggle('as-hidden', mode === 'popular');
        }
    }

    // ── Popular Mode ─────────────────────────────────────────────────────────

    /**
     * Get filtered + sorted courses for popular mode
     */
    _getPopularCourses() {
        var self = this;
        var filtered = this.items;
        var term = this._popularFilter.toLowerCase().trim();
        if (term) {
            filtered = filtered.filter(function(c) {
                return self._getSearchableText(c).toLowerCase().indexOf(term) !== -1;
            });
        }
        // Sort by student count descending
        filtered.sort(function(a, b) {
            return (b.studentCount || b.enrolmentCount || 0) - (a.studentCount || a.enrolmentCount || 0);
        });
        return filtered;
    }

    /**
     * Render the popular mode: year selector + filter + paginated course list
     */
    _renderPopularList() {
        if (!this._popularContainerEl) return;
        this._popularContainerEl.innerHTML = '';
        var self = this;

        // ── Header row: year selector + filter input ──
        var headerRow = document.createElement('div');
        headerRow.className = 'as-flex-row-center as-mb-2';

        // Year selector
        if (this._yearRange || this._onYearChange) {
            var yearSelect = document.createElement('select');
            yearSelect.className = 'as-year-select';
            var range = this._yearRange || [];
            if (range.length === 0) {
                var cur = new Date().getFullYear();
                for (var y = cur; y >= cur - 6; y--) range.push(y);
            }
            range.forEach(function(yr) {
                var opt = document.createElement('option');
                opt.value = yr;
                opt.textContent = yr;
                if (yr == self._year) opt.selected = true;
                yearSelect.appendChild(opt);
            });
            yearSelect.addEventListener('change', function() {
                self._onYearSelected(parseInt(yearSelect.value));
            });
            headerRow.appendChild(yearSelect);
        } else {
            var yearLabel = document.createElement('span');
            yearLabel.className = 'as-year-label';
            yearLabel.textContent = this._year;
            headerRow.appendChild(yearLabel);
        }

        // Filter input
        var filterInput = document.createElement('input');
        filterInput.type = 'text';
        filterInput.placeholder = 'Filter by code or name...';
        filterInput.className = 'as-filter-input';
        filterInput.value = this._popularFilter;
        filterInput.addEventListener('input', function() {
            self._popularFilter = filterInput.value;
            self._popularPage = 1;
            self._renderPopularPage();
        });
        headerRow.appendChild(filterInput);

        this._popularContainerEl.appendChild(headerRow);

        // ── Course list area ──
        this._popularListEl = document.createElement('div');
        this._popularListEl.className = 'as-scrollable as-list-scroll-sm';
        this._popularContainerEl.appendChild(this._popularListEl);

        // ── Pagination controls ──
        this._popularPaginationEl = document.createElement('div');
        this._popularPaginationEl.className = 'as-pagination as-flex-row-between';
        this._popularContainerEl.appendChild(this._popularPaginationEl);

        this._renderPopularPage();

        // Focus filter input
        setTimeout(function() { filterInput.focus(); }, 100);
    }

    /**
     * Render the current page of popular courses
     */
    _renderPopularPage() {
        if (!this._popularListEl) return;
        this._popularListEl.innerHTML = '';
        var self = this;

        var courses = this._getPopularCourses();
        var totalPages = Math.max(1, Math.ceil(courses.length / this._popularPageSize));
        if (this._popularPage > totalPages) this._popularPage = totalPages;
        var start = (this._popularPage - 1) * this._popularPageSize;
        var page = courses.slice(start, start + this._popularPageSize);

        if (courses.length === 0) {
            var empty = document.createElement('div');
            empty.className = 'as-loading-state-text text-center p-4';
            empty.textContent = this._popularFilter ? 'No courses match "' + this._popularFilter + '"' : 'No courses loaded';
            this._popularListEl.appendChild(empty);
        } else {
            page.forEach(function(course, i) {
                var rank = start + i + 1;
                var card = self._renderPopularCard(course, rank);
                self._popularListEl.appendChild(card);
            });

            // Lazy-enrich: fetch labels for visible courses that haven't been enriched
            this._enrichVisiblePage(page);
        }

        // Pagination
        this._renderPopularPagination(courses.length, totalPages);
    }

    /**
     * Lazy-load labels for a page of courses via onEnrichPage callback.
     * Only fetches codes that haven't been enriched yet. Re-renders page when done.
     */
    _enrichVisiblePage(pageCourses) {
        if (!this._onEnrichPage) return;
        var self = this;
        var needed = [];
        pageCourses.forEach(function(c) {
            var code = c.code || c.courseCode;
            if (code && !self._enrichedCodes[code] && !c.label) {
                needed.push(code);
                self._enrichedCodes[code] = true;  // mark pending
            }
        });
        if (needed.length === 0) return;

        Promise.resolve(this._onEnrichPage(needed)).then(function(updatedCourses) {
            if (updatedCourses && Array.isArray(updatedCourses)) {
                self.items = updatedCourses;
                self._courses = updatedCourses;
            }
            // Re-render the page with labels now available
            self._rerenderPopularCards();
        }).catch(function() {});
    }

    /**
     * Re-render just the card contents without rebuilding the full page
     */
    _rerenderPopularCards() {
        if (!this._popularListEl) return;
        var self = this;
        var courses = this._getPopularCourses();
        var start = (this._popularPage - 1) * this._popularPageSize;
        var page = courses.slice(start, start + this._popularPageSize);
        this._popularListEl.innerHTML = '';
        page.forEach(function(course, i) {
            var rank = start + i + 1;
            var card = self._renderPopularCard(course, rank);
            self._popularListEl.appendChild(card);
        });
    }

    /**
     * Render a single course card for popular mode with rank number
     */
    _renderPopularCard(course, rank) {
        var self = this;
        var card = document.createElement('div');
        card.className = 'as-card-hover-compact';
        card.addEventListener('click', function() {
            self._handleItemClick(course, self.items);
        });
        card.setAttribute('role', 'option');

        // Rank number
        var rankEl = document.createElement('div');
        rankEl.className = 'as-course-rank';
        rankEl.textContent = rank;
        card.appendChild(rankEl);

        // Course info (middle)
        var info = document.createElement('div');
        info.className = 'as-flex-1';

        var codeText = course.code || course.courseCode || 'Unknown';
        var labelText = course.label || course.courseLabel || course.name || '';

        var codeLine = document.createElement('div');
        codeLine.className = 'as-course-code';
        codeLine.innerHTML = this._highlightText(codeText, this._popularFilter);
        info.appendChild(codeLine);

        if (labelText) {
            var labelLine = document.createElement('div');
            labelLine.className = 'as-course-label';
            labelLine.innerHTML = this._highlightText(labelText, this._popularFilter);
            info.appendChild(labelLine);
        }

        card.appendChild(info);

        // Right side: student count + credits
        var right = document.createElement('div');
        right.className = 'as-flex-shrink-0 text-right';

        var count = course.studentCount || course.enrolmentCount || 0;
        var countEl = document.createElement('div');
        countEl.className = 'as-count-value';
        countEl.textContent = count.toLocaleString();
        right.appendChild(countEl);

        var countLabel = document.createElement('div');
        countLabel.className = 'as-count-label';
        countLabel.textContent = 'students';
        right.appendChild(countLabel);

        card.appendChild(right);

        return card;
    }

    /**
     * Render pagination controls
     */
    _renderPopularPagination(totalItems, totalPages) {
        if (!this._popularPaginationEl) return;
        this._popularPaginationEl.innerHTML = '';
        var self = this;

        // Info text
        var info = document.createElement('span');
        info.className = 'as-pagination-info';
        if (totalItems > 0) {
            var start = (this._popularPage - 1) * this._popularPageSize + 1;
            var end = Math.min(this._popularPage * this._popularPageSize, totalItems);
            info.textContent = start + '–' + end + ' of ' + totalItems;
        } else {
            info.textContent = '0 courses';
        }
        this._popularPaginationEl.appendChild(info);

        if (totalPages <= 1) return;

        // Page buttons
        var btnRow = document.createElement('div');
        btnRow.className = 'as-flex-row-center';

        var prevBtn = document.createElement('button');
        prevBtn.innerHTML = '&laquo;';
        prevBtn.disabled = this._popularPage <= 1;
        prevBtn.className = 'as-pagination-btn';
        prevBtn.addEventListener('click', function() {
            if (self._popularPage > 1) { self._popularPage--; self._renderPopularPage(); }
        });
        btnRow.appendChild(prevBtn);

        var pageInfo = document.createElement('span');
        pageInfo.className = 'as-page-info';
        pageInfo.textContent = this._popularPage + '/' + totalPages;
        btnRow.appendChild(pageInfo);

        var nextBtn = document.createElement('button');
        nextBtn.innerHTML = '&raquo;';
        nextBtn.disabled = this._popularPage >= totalPages;
        nextBtn.className = 'as-pagination-btn';
        nextBtn.addEventListener('click', function() {
            if (self._popularPage < totalPages) { self._popularPage++; self._renderPopularPage(); }
        });
        btnRow.appendChild(nextBtn);

        this._popularPaginationEl.appendChild(btnRow);
    }

    /**
     * Handle year change from dropdown
     */
    _onYearSelected(year) {
        if (year === this._year) return;
        this._year = year;
        this._popularPage = 1;
        this._popularFilter = '';
        this._enrichedCodes = {};  // reset enrichment cache for new year

        if (this._onYearChange) {
            var self = this;
            // Show loading state
            if (this._popularListEl) {
                this._popularListEl.innerHTML = '';
                var loading = document.createElement('div');
                loading.className = 'as-loading-state';
                loading.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span class="as-loading-state-text">Loading courses for ' + year + '...</span>';
                this._popularListEl.appendChild(loading);
            }

            Promise.resolve(this._onYearChange(year)).then(function(courses) {
                if (courses && Array.isArray(courses)) {
                    self.items = courses;
                    self._courses = courses;
                }
                self._renderPopularPage();
            }).catch(function() {
                self._renderPopularPage();
            });
        } else {
            this._renderPopularPage();
        }
    }

    // ── Browse Mode (tree) ───────────────────────────────────────────────────

    /**
     * Build tree data from items — adapts structure based on available labels.
     */
    _buildBrowseTreeData() {
        var hasFacultyLabels = Object.keys(this._facultyLabels).length > 0 ||
            this.items.some(function(c) { return c.facultyLabel; });
        if (hasFacultyLabels) return this._buildFacultyTree();
        return this._buildAlphaTree();
    }

    _buildAlphaTree() {
        var groups = {};
        this.items.forEach(function(c) {
            var code = c.code || c.courseCode || '?';
            var letter = code.charAt(0).toUpperCase();
            if (!letter.match(/[A-Z]/)) letter = '#';
            if (!groups[letter]) groups[letter] = [];
            groups[letter].push(c);
        });
        return Object.keys(groups).sort().map(function(letter) {
            var courses = groups[letter];
            courses.sort(function(a, b) {
                return (a.code || a.courseCode || '').localeCompare(b.code || b.courseCode || '');
            });
            return {
                label: letter,
                iconHtml: '<i class="fas fa-folder" style="font-size:0.75em;color:var(--ui-secondary-600);"></i>',
                badge: courses.length, badgeColor: 'var(--ui-secondary-600)', expanded: false,
                children: courses.map(function(c) { return CourseSelector._courseNode(c); })
            };
        });
    }

    _buildFacultyTree() {
        var self = this;
        var faculties = {};
        this.items.forEach(function(c) {
            var fc = c.facultyCode || '_none';
            var dc = c.disciplineCode || '_none';
            if (!faculties[fc]) faculties[fc] = {};
            if (!faculties[fc][dc]) faculties[fc][dc] = [];
            faculties[fc][dc].push(c);
        });

        var treeData = [];
        Object.keys(faculties).sort().forEach(function(fc) {
            var facultyLabel = self._facultyLabels[fc] || '';
            if (!facultyLabel) {
                var sample = faculties[fc][Object.keys(faculties[fc])[0]];
                if (sample && sample[0]) facultyLabel = sample[0].facultyLabel || '';
            }
            if (!facultyLabel) facultyLabel = fc === '_none' ? 'Other' : fc;

            var disciplines = faculties[fc];
            var facultyCourseCount = 0;
            var discNodes = [];

            Object.keys(disciplines).sort().forEach(function(dc) {
                var courses = disciplines[dc];
                facultyCourseCount += courses.length;
                var discLabel = self._disciplineLabels[dc] || '';
                if (!discLabel && courses[0]) discLabel = courses[0].disciplineLabel || '';
                var courseNodes = courses.map(function(c) { return CourseSelector._courseNode(c); });

                if (discLabel && dc !== '_none') {
                    discNodes.push({
                        label: discLabel, sublabel: dc,
                        iconHtml: '<i class="fas fa-layer-group" style="font-size:0.75em;color:var(--ui-primary-500);"></i>',
                        badge: courses.length, badgeColor: 'var(--ui-primary-500)', expanded: false, children: courseNodes
                    });
                } else {
                    discNodes = discNodes.concat(courseNodes);
                }
            });

            treeData.push({
                label: facultyLabel,
                sublabel: fc !== '_none' && fc !== facultyLabel ? fc : null,
                iconHtml: '<i class="fas fa-university" style="font-size:0.75em;color:var(--ui-secondary-600);"></i>',
                badge: facultyCourseCount, badgeColor: 'var(--ui-secondary-600)', expanded: false, children: discNodes
            });
        });
        return treeData;
    }

    static _courseNode(c) {
        var code = c.code || c.courseCode || 'Unknown';
        var name = c.label || c.courseLabel || c.name || '';
        var creditText = c.credits ? c.credits + ' cr' : '';
        return {
            label: code, sublabel: name,
            iconHtml: '<i class="fas fa-book" style="font-size:0.7em;color:var(--ui-gray-500);"></i>',
            badge: creditText || null, badgeColor: 'var(--ui-gray-400)', expanded: false,
            _course: c, _type: 'course'
        };
    }

    _renderBrowseTree() {
        if (!this._browseTreeContainerEl) return;
        this._browseTreeContainerEl.innerHTML = '';
        var self = this;
        this._browseTree = new uiTreeView({
            parent: this._browseTreeContainerEl,
            data: this._buildBrowseTreeData(),
            selectable: true, searchable: false
        });
        this._browseTree.bus.on('select', function(e) {
            if (e.node._type === 'course' && e.node._course) {
                self._handleItemClick(e.node._course, self.items);
            }
        });
    }

    // ── Filter override ──────────────────────────────────────────────────────

    _filterItems(searchTerm) {
        var term = (searchTerm || '').toLowerCase().trim();
        this.currentSearchTerm = term;
        this.focusedIndex = -1;

        if (this._activeMode === 'browse' && this._browseTree) {
            this._browseTree._searchTerm = term;
            this._browseTree._rerenderNodes();
            return;
        }

        if (this._activeMode === 'popular') {
            // Popular mode has its own filter — ignore base search
            return;
        }

        // Search mode
        if (!term || (this.minSearchLength && term.length < this.minSearchLength)) {
            if (this.minSearchLength && (!term || term.length < this.minSearchLength)) {
                this._showSearchPrompt();
            } else {
                this._renderItems(this.items);
            }
            return;
        }

        if (typeof AutoScholarUtils !== 'undefined' && term.length >= 2) {
            AutoScholarUtils.saveRecentSearch(this.searchContext, term);
        }

        var self = this;
        var filtered = this.items.filter(function(item) {
            return self._getSearchableText(item).toLowerCase().includes(term);
        });
        this._renderItems(filtered);
    }

    /**
     * Get searchable text for a course
     */
    _getSearchableText(course) {
        const code = course.code || course.courseCode || '';
        const label = course.label || course.courseLabel || course.name || '';
        return `${code} ${label}`;
    }

    /**
     * Badge class helper — returns CSS class string for badge variant
     */
    static _badgeClass(color) {
        var variants = { gray: 'gray', primary: 'primary', info: 'info', success: 'success', warning: 'warning' };
        return 'as-cs-badge as-cs-badge--' + (variants[color] || 'gray');
    }

    /**
     * Render a course card — used by search mode
     */
    _renderItem(course, isSelected, index) {
        const card = document.createElement('div');
        card.className = isSelected ? 'as-selector-card as-selector-card-selected' : 'as-selector-card';

        const codeText = course.code || course.courseCode || 'Unknown';
        const labelText = course.label || course.courseLabel || course.name || '';
        card.setAttribute('aria-label', codeText + ': ' + labelText);

        const header = document.createElement('div');
        header.className = 'as-flex-row-between mb-1';

        const codeLabel = document.createElement('div');
        codeLabel.className = 'as-flex-row-center';

        if (this.multiSelect) {
            const checkbox = document.createElement('span');
            checkbox.className = isSelected ? 'text-primary-500' : 'text-gray-300';
            checkbox.innerHTML = isSelected ? '<i class="fas fa-check-circle"></i>' : '<i class="far fa-circle"></i>';
            codeLabel.appendChild(checkbox);
        }

        const codeEl = document.createElement('span');
        codeEl.className = 'as-course-code-lg';
        codeEl.innerHTML = this._highlightText(codeText, this.currentSearchTerm);
        codeLabel.appendChild(codeEl);
        header.appendChild(codeLabel);

        const badges = document.createElement('div');
        badges.className = 'as-flex-row-center';
        if (course.credits) {
            const creditsBadge = document.createElement('span');
            creditsBadge.className = CourseSelector._badgeClass('gray');
            creditsBadge.textContent = course.credits + ' cr';
            badges.appendChild(creditsBadge);
        }
        if (course.classGroup) {
            const groupBadge = document.createElement('span');
            groupBadge.className = CourseSelector._badgeClass('primary');
            groupBadge.textContent = 'Group ' + course.classGroup;
            badges.appendChild(groupBadge);
        }
        const studentCount = course.studentCount || course.enrolmentCount || 0;
        if (studentCount > 0) {
            const studentBadge = document.createElement('span');
            studentBadge.className = CourseSelector._badgeClass('info');
            studentBadge.textContent = studentCount + ' students';
            badges.appendChild(studentBadge);
        }
        header.appendChild(badges);
        card.appendChild(header);

        if (labelText) {
            const labelEl = document.createElement('div');
            labelEl.className = 'as-course-label-wrap';
            labelEl.innerHTML = this._highlightText(labelText, this.currentSearchTerm);
            card.appendChild(labelEl);
        }

        if (course.year || course.semester) {
            const meta = document.createElement('div');
            meta.className = 'as-course-meta';
            const parts = [];
            if (course.year) parts.push(course.year);
            if (course.semester) parts.push('Sem ' + course.semester);
            meta.innerHTML = '<i class="fas fa-calendar-alt" style="font-size:0.55rem;"></i> ' + parts.join(' \u2022 ');
            card.appendChild(meta);
        }

        return card;
    }

    /**
     * Static helper to create and open selector
     */
    static select(settings) {
        const selector = new CourseSelector(settings);
        selector.open();
        return selector;
    }

    /**
     * Get courses from academic service with enriched data
     */
    static getCoursesFromService(academicService, options = {}) {
        if (!academicService) return [];
        const courses = academicService.publon?.course?.rows?.filter(c => c) || [];
        const offerings = academicService.publon?.offering?.rows?.filter(o => o) || [];
        const enrolments = academicService.publon?.enrolment?.rows?.filter(e => e) || [];
        return courses.map(course => {
            const courseOfferings = offerings.filter(o => o.courseId === course.idx);
            const offeringIds = courseOfferings.map(o => o.idx);
            const courseEnrolments = enrolments.filter(e => offeringIds.includes(e.offeringId));
            return { ...course, offeringCount: courseOfferings.length, studentCount: courseEnrolments.length, latestOffering: courseOfferings[courseOfferings.length - 1] };
        });
    }

    /**
     * Get lecturer's courses from offerings
     */
    static getLecturerCourses(academicService, lecturerId) {
        if (!academicService || !lecturerId) return [];
        const offerings = academicService.publon?.offering?.rows?.filter(o => o && o.lecturerId === lecturerId) || [];
        const courses = academicService.publon?.course?.rows?.filter(c => c) || [];
        const enrolments = academicService.publon?.enrolment?.rows?.filter(e => e) || [];
        return offerings.map(offering => {
            const course = courses.find(c => c.idx === offering.courseId);
            const offeringEnrolments = enrolments.filter(e => e.offeringId === offering.idx && e.status === 'enrolled');
            return { idx: offering.idx, courseId: offering.courseId, code: course?.code || 'Unknown', label: course?.label || '', credits: course?.credits || 0, year: offering.year, semester: offering.semester, studentCount: offeringEnrolments.length, offering: offering };
        });
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.CourseSelector = CourseSelector;
}
