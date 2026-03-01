/**
 * TimetableViews - Static view methods for timetable rendering
 *
 * Renders week-view grid using TimetableService data.
 * Called by AutoScholarStudent._renderMyTimetable() and
 * AutoScholarAdmin for admin timetable panel.
 */
class TimetableViews {

    // ── Student Timetable ──────────────────────────────────────────────────

    static renderStudentTimetable(container, studentId, timetable, academic) {
        // Header
        const header = container.add({ css: 'flex items-center justify-between mb-4' });
        const titleArea = header.add({ css: 'flex items-center gap-3' });
        titleArea.add({ tag: 'i', css: 'fas fa-calendar-alt text-primary text-xl' });
        titleArea.add({ tag: 'h2', css: 'text-lg font-semibold', script: 'My Timetable' });

        // Week/day toggle
        const viewToggle = header.add({ css: 'flex gap-1' });
        const weekBtn = viewToggle.add({
            css: 'px-3 py-1 rounded text-sm cursor-pointer bg-primary text-white',
            script: 'Week'
        });
        const dayBtn = viewToggle.add({
            css: 'px-3 py-1 rounded text-sm cursor-pointer bg-gray-100 text-gray-600 hover:bg-gray-200',
            script: 'Today'
        });

        // Week grid container
        const gridContainer = container.add({ css: '' });
        TimetableViews._renderWeekGrid(gridContainer, studentId, timetable, academic);

        // Toggle handlers
        weekBtn.domElement.onclick = () => {
            weekBtn.domElement.className = 'px-3 py-1 rounded text-sm cursor-pointer bg-primary text-white';
            dayBtn.domElement.className = 'px-3 py-1 rounded text-sm cursor-pointer bg-gray-100 text-gray-600 hover:bg-gray-200';
            gridContainer.clear(true);
            TimetableViews._renderWeekGrid(gridContainer, studentId, timetable, academic);
        };
        dayBtn.domElement.onclick = () => {
            dayBtn.domElement.className = 'px-3 py-1 rounded text-sm cursor-pointer bg-primary text-white';
            weekBtn.domElement.className = 'px-3 py-1 rounded text-sm cursor-pointer bg-gray-100 text-gray-600 hover:bg-gray-200';
            gridContainer.clear(true);
            TimetableViews._renderDayView(gridContainer, studentId, timetable, academic);
        };
    }

    // ── Admin Timetable Panel ──────────────────────────────────────────────

    static renderAdminPanel(container, timetable, academic) {
        const header = container.add({ css: 'flex items-center justify-between mb-4' });
        header.add({ css: 'flex items-center gap-2' })
            .domElement.innerHTML = '<i class="fas fa-table text-primary text-xl"></i><span class="text-lg font-semibold">Timetable Management</span>';

        if (!timetable) {
            container.add({ css: 'text-center py-8 text-muted', script: 'Timetable service not available' });
            return;
        }

        // Stats row
        const stats = container.add({ css: 'flex flex-wrap gap-3 mb-4' });
        const slots = timetable.publon?.timetableSlot?.rows?.filter(s => s) || [];
        const venues = timetable.publon?.venue?.rows?.filter(v => v) || [];
        const periods = timetable.publon?.period?.rows?.filter(p => p) || [];

        TimetableViews._renderStat(stats, 'calendar-check', 'Slots', slots.length, 'text-blue-600 bg-blue-50');
        TimetableViews._renderStat(stats, 'building', 'Venues', venues.length, 'text-green-600 bg-green-50');
        TimetableViews._renderStat(stats, 'clock', 'Periods', periods.length, 'text-purple-600 bg-purple-50');

        // Venue list
        if (venues.length > 0) {
            const venueSection = container.add({ css: 'mb-4' });
            venueSection.add({ css: 'font-semibold mb-2', script: 'Venues' });
            const venueGrid = venueSection.add({ css: 'flex flex-wrap gap-2' });
            venues.forEach(v => {
                const card = venueGrid.add({
                    css: 'card p-2 text-sm',
                    style: 'flex: 1 1 150px; min-width: 130px; max-width: 220px;'
                });
                card.add({ css: 'font-medium', script: v.name || v.code || 'Venue' });
                if (v.building) card.add({ css: 'text-xs text-muted', script: v.building });
                if (v.capacity) card.add({ css: 'text-xs text-muted', script: `Capacity: ${v.capacity}` });
            });
        }

        // Slot list
        if (slots.length > 0) {
            const slotSection = container.add({});
            slotSection.add({ css: 'font-semibold mb-2', script: 'Timetable Slots' });
            TimetableViews._renderSlotsTable(slotSection, slots, timetable, academic);
        }
    }

    // ── Week Grid Renderer ─────────────────────────────────────────────────

    static _renderWeekGrid(container, studentId, timetable, academic) {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const hours = [];
        for (let h = 8; h <= 17; h++) {
            hours.push(`${String(h).padStart(2, '0')}:00`);
        }

        // Get student's timetable slots
        const slots = TimetableViews._getStudentSlots(studentId, timetable, academic);

        // Color palette for courses
        const courseColors = [
            { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800' },
            { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-800' },
            { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-800' },
            { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-800' },
            { bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-800' },
            { bg: 'bg-teal-100', border: 'border-teal-300', text: 'text-teal-800' },
            { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-800' },
            { bg: 'bg-indigo-100', border: 'border-indigo-300', text: 'text-indigo-800' }
        ];
        const courseColorMap = {};
        let colorIdx = 0;

        // Build grid as HTML table for precise alignment
        const tableWrapper = container.add({ css: 'overflow-x-auto' });
        const table = tableWrapper.add({ tag: 'table', css: 'w-full border-collapse text-sm' });

        // Header row
        const thead = table.add({ tag: 'thead' });
        const headerRow = thead.add({ tag: 'tr' });
        headerRow.add({ tag: 'th', css: 'p-2 text-left text-xs text-muted border-b w-16', script: '' });
        days.forEach(day => {
            const isToday = new Date().toLocaleDateString('en-US', { weekday: 'long' }) === day;
            headerRow.add({
                tag: 'th',
                css: `p-2 text-center text-xs font-semibold border-b ${isToday ? 'text-primary bg-primary bg-opacity-5' : 'text-gray-600'}`,
                script: day.substring(0, 3)
            });
        });

        // Body rows (one per hour)
        const tbody = table.add({ tag: 'tbody' });
        hours.forEach((hour, hourIdx) => {
            const row = tbody.add({ tag: 'tr', css: 'border-b border-gray-100' });

            // Time label
            row.add({ tag: 'td', css: 'p-1 text-xs text-muted text-right pr-2 align-top', script: hour });

            // Day cells
            days.forEach((day, dayIdx) => {
                const cell = row.add({ tag: 'td', css: 'p-0.5 align-top border-l border-gray-100', style: 'min-height: 3rem; height: 3rem;' });

                // Find slots for this day/hour
                const cellSlots = slots.filter(s => {
                    const slotDay = TimetableViews._getDayIndex(s.day || s.dayOfWeek);
                    const slotStart = parseInt((s.startTime || '08:00').split(':')[0]);
                    return slotDay === dayIdx && slotStart === (8 + hourIdx);
                });

                cellSlots.forEach(slot => {
                    const courseCode = slot.courseCode || slot.code || '??';
                    if (!courseColorMap[courseCode]) {
                        courseColorMap[courseCode] = courseColors[colorIdx % courseColors.length];
                        colorIdx++;
                    }
                    const colors = courseColorMap[courseCode];

                    const block = cell.add({
                        css: `${colors.bg} ${colors.border} ${colors.text} border-l-2 rounded p-1 mb-0.5`,
                        style: 'font-size: 0.7rem; line-height: 1.2;'
                    });
                    block.add({ css: 'font-bold truncate', script: courseCode });
                    if (slot.venue || slot.room) {
                        block.add({ css: 'truncate opacity-80', script: slot.venue || slot.room });
                    }
                    if (slot.type) {
                        block.add({ css: 'truncate opacity-60 italic', script: slot.type });
                    }
                });
            });
        });

        // Legend
        if (Object.keys(courseColorMap).length > 0) {
            const legend = container.add({ css: 'flex flex-wrap gap-2 mt-3 pt-3 border-t' });
            legend.add({ css: 'text-xs text-muted', script: 'Legend:' });
            Object.entries(courseColorMap).forEach(([code, colors]) => {
                const item = legend.add({ css: `flex items-center gap-1 ${colors.text} text-xs` });
                item.add({ css: `w-3 h-3 rounded ${colors.bg} ${colors.border} border` });
                item.add({ script: code });
            });
        }

        // Empty state
        if (slots.length === 0) {
            container.add({ css: 'text-center py-8 text-muted' })
                .domElement.innerHTML = '<i class="fas fa-calendar-times text-4xl mb-3 opacity-50"></i><p>No timetable data available</p>';
        }
    }

    // ── Day View Renderer ──────────────────────────────────────────────────

    static _renderDayView(container, studentId, timetable, academic) {
        const today = new Date();
        const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
        const dayIdx = today.getDay() - 1; // 0=Mon, 4=Fri

        container.add({ css: 'font-semibold text-lg mb-3', script: `Today — ${dayName}` });

        if (dayIdx < 0 || dayIdx > 4) {
            container.add({ css: 'text-center py-8 text-muted' })
                .domElement.innerHTML = '<i class="fas fa-umbrella-beach text-4xl mb-3 opacity-50"></i><p>It\'s the weekend! No classes today.</p>';
            return;
        }

        const slots = TimetableViews._getStudentSlots(studentId, timetable, academic);
        const todaySlots = slots.filter(s => {
            const slotDay = TimetableViews._getDayIndex(s.day || s.dayOfWeek);
            return slotDay === dayIdx;
        }).sort((a, b) => {
            const aTime = (a.startTime || '08:00').replace(':', '');
            const bTime = (b.startTime || '08:00').replace(':', '');
            return parseInt(aTime) - parseInt(bTime);
        });

        if (todaySlots.length === 0) {
            container.add({ css: 'text-center py-8 text-muted' })
                .domElement.innerHTML = '<i class="fas fa-coffee text-4xl mb-3 opacity-50"></i><p>No classes today</p>';
            return;
        }

        // Timeline view
        const timeline = container.add({ css: 'space-y-2' });
        todaySlots.forEach(slot => {
            const card = timeline.add({ css: 'card p-3 flex items-center gap-3' });

            // Time column
            const time = card.add({ css: 'text-center flex-shrink-0 w-16' });
            time.add({ css: 'font-bold text-sm', script: slot.startTime || '??:??' });
            time.add({ css: 'text-xs text-muted', script: slot.endTime || '' });

            // Divider
            card.add({ css: 'w-1 h-10 bg-primary rounded-full flex-shrink-0' });

            // Course info
            const info = card.add({ css: 'flex-1' });
            info.add({ css: 'font-semibold text-sm', script: slot.courseCode || slot.courseName || 'Class' });
            if (slot.courseName && slot.courseCode) {
                info.add({ css: 'text-xs text-muted', script: slot.courseName });
            }
            const meta = info.add({ css: 'text-xs text-muted flex items-center gap-2 mt-1' });
            if (slot.venue || slot.room) {
                meta.add({ css: 'flex items-center gap-1' })
                    .domElement.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${slot.venue || slot.room}`;
            }
            if (slot.lecturer) {
                meta.add({ css: 'flex items-center gap-1' })
                    .domElement.innerHTML = `<i class="fas fa-user"></i> ${slot.lecturer}`;
            }
            if (slot.type) {
                meta.add({ css: 'flex items-center gap-1' })
                    .domElement.innerHTML = `<i class="fas fa-tag"></i> ${slot.type}`;
            }
        });
    }

    // ── Data Helpers ────────────────────────────────────────────────────────

    static _getStudentSlots(studentId, timetable, academic) {
        if (!timetable?.publon?.timetableSlot) return [];

        const allSlots = timetable.publon.timetableSlot.rows?.filter(s => s) || [];
        const periods = timetable.publon?.period?.rows?.filter(p => p) || [];
        const venues = timetable.publon?.venue?.rows?.filter(v => v) || [];

        // Get student's enrolled offering IDs
        const enrolments = academic?.publon?.enrolment?.rows?.filter(e => e && e.studentId === studentId) || [];
        const offeringIds = enrolments.map(e => e.offeringId);

        // Filter slots for student's offerings
        const studentSlots = allSlots.filter(slot =>
            !slot.offeringId || offeringIds.includes(slot.offeringId)
        );

        // Enrich slots with period and venue data
        return studentSlots.map(slot => {
            const period = periods.find(p => p.idx === slot.periodId);
            const venue = venues.find(v => v.idx === slot.venueId);
            const offering = academic?.publon?.offering?.rows?.find(o => o?.idx === slot.offeringId);
            const course = offering ? academic?.publon?.course?.rows?.find(c => c?.idx === offering.courseId) : null;

            return {
                idx: slot.idx,
                day: slot.dayOfWeek || slot.day,
                dayOfWeek: slot.dayOfWeek || slot.day,
                startTime: period?.startTime || slot.startTime,
                endTime: period?.endTime || slot.endTime,
                venue: venue?.name || venue?.code || slot.venueName,
                room: venue?.room,
                building: venue?.building,
                courseCode: course?.code || slot.courseCode,
                courseName: course?.label || course?.name || slot.courseName,
                lecturer: slot.lecturerName || slot.lecturer,
                type: slot.type || slot.sessionType // Lecture, Practical, Tutorial
            };
        });
    }

    static _getDayIndex(day) {
        if (typeof day === 'number') return day;
        const dayMap = {
            'monday': 0, 'mon': 0, '0': 0,
            'tuesday': 1, 'tue': 1, '1': 1,
            'wednesday': 2, 'wed': 2, '2': 2,
            'thursday': 3, 'thu': 3, '3': 3,
            'friday': 4, 'fri': 4, '4': 4
        };
        return dayMap[String(day).toLowerCase()] ?? -1;
    }

    static _renderStat(container, icon, label, value, colorCss) {
        const card = container.add({
            css: 'card p-3 text-center',
            style: 'flex: 1 1 100px; min-width: 90px;'
        });
        card.add({ tag: 'i', css: `fas fa-${icon} text-xl mb-1 ${colorCss.split(' ')[0]}` });
        card.add({ css: 'text-lg font-bold', script: String(value) });
        card.add({ css: 'text-xs text-muted', script: label });
    }

    static _renderSlotsTable(container, slots, timetable, academic) {
        const table = container.add({ tag: 'table', css: 'w-full text-sm' });
        const thead = table.add({ tag: 'thead' });
        const headRow = thead.add({ tag: 'tr', css: 'border-b' });
        ['Day', 'Time', 'Course', 'Venue', 'Type'].forEach(h => {
            headRow.add({ tag: 'th', css: 'text-left py-2 px-2 text-xs text-muted', script: h });
        });

        const tbody = table.add({ tag: 'tbody' });
        const periods = timetable.publon?.period?.rows?.filter(p => p) || [];
        const venues = timetable.publon?.venue?.rows?.filter(v => v) || [];

        slots.forEach(slot => {
            const period = periods.find(p => p.idx === slot.periodId);
            const venue = venues.find(v => v.idx === slot.venueId);
            const offering = academic?.publon?.offering?.rows?.find(o => o?.idx === slot.offeringId);
            const course = offering ? academic?.publon?.course?.rows?.find(c => c?.idx === offering.courseId) : null;

            const row = tbody.add({ tag: 'tr', css: 'border-b border-gray-100' });
            row.add({ tag: 'td', css: 'py-2 px-2', script: slot.dayOfWeek || slot.day || '-' });
            row.add({ tag: 'td', css: 'py-2 px-2', script: period ? `${period.startTime}-${period.endTime}` : '-' });
            row.add({ tag: 'td', css: 'py-2 px-2 font-medium', script: course?.code || '-' });
            row.add({ tag: 'td', css: 'py-2 px-2', script: venue?.name || '-' });
            row.add({ tag: 'td', css: 'py-2 px-2', script: slot.type || slot.sessionType || '-' });
        });
    }
}
