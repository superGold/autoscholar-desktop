/**
 * StudentSchedulePanel - Wraps TimetableViews for student timetable display
 *
 * Delegates rendering to TimetableViews.renderStudentTimetable()
 * and adds EventService integration for non-class events.
 */
class StudentSchedulePanel {
    constructor(settings = {}) {
        this.services = settings.services;
        this.currentUser = settings.currentUser;
        this.app = settings.app;
    }

    render(container) {
        const timetable = this.services.timetable;
        const academic = this.services.academic;

        if (!timetable || !academic) {
            const emptyState = container.add({ css: 'text-center py-8 text-muted' });
            emptyState.add({ tag: 'i', css: 'fas fa-calendar-times text-4xl mb-3 opacity-50 block' });
            emptyState.add({ tag: 'p', script: 'Timetable service not available' });
            return;
        }

        // Delegate to TimetableViews
        if (typeof TimetableViews !== 'undefined') {
            TimetableViews.renderStudentTimetable(container, this.currentUser.idx, timetable, academic);
        } else {
            container.add({ css: 'text-center py-8 text-muted', script: 'TimetableViews not loaded' });
            return;
        }

        // Events section (non-class events from EventService)
        this._renderUpcomingEvents(container);
    }

    _renderUpcomingEvents(container) {
        const eventService = this.services.event;
        if (!eventService) return;

        const events = eventService.publon?.event?.rows?.filter(e => {
            if (!e) return false;
            const eventDate = new Date(e.startDate || e.date);
            return eventDate >= new Date();
        }) || [];

        if (events.length === 0) return;

        const section = container.add({ css: 'mt-4 pt-4 border-t' });
        const sectionHeader = section.add({ css: 'flex items-center gap-2 mb-3' });
        sectionHeader.add({ tag: 'i', css: 'fas fa-calendar-check text-green-500' });
        sectionHeader.add({ tag: 'span', css: 'font-semibold', script: 'Upcoming Events' });

        const grid = section.add({ css: 'flex flex-wrap gap-2' });
        events.sort((a, b) => new Date(a.startDate || a.date) - new Date(b.startDate || b.date))
            .slice(0, 6).forEach(event => {
                const card = grid.add({ css: 'card p-2 text-sm as-flex-card-sm' });
                const header = card.add({ css: 'flex items-center gap-2' });
                header.add({ tag: 'i', css: 'fas fa-calendar text-blue-500 text-xs' });
                header.add({ css: 'font-medium truncate', script: event.title || event.name || 'Event' });

                const date = new Date(event.startDate || event.date);
                card.add({ css: 'text-xs text-muted mt-1', script: date.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' }) });
                if (event.location) {
                    const locRow = card.add({ css: 'text-xs text-muted flex items-center gap-1 mt-1' });
                    locRow.add({ tag: 'i', css: 'fas fa-map-marker-alt' });
                    locRow.add({ script: event.location });
                }
            });
    }
}
