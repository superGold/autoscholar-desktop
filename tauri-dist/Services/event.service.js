/**
 * EventService - Calendar and Event Management
 *
 * Provides event scheduling, calendar management, reminders,
 * attendee tracking, and recurring event support.
 *
 * Tables:
 * - event: Events with timing, location, recurrence
 * - eventType: Event categories/types
 * - eventAttendee: Event participants with RSVP
 * - eventReminder: Scheduled reminders
 *
 * @example
 * const eventService = new EventService();
 * ServiceRegistry.register('event', eventService, { alias: 'Event Service' });
 *
 * // Create an event
 * const event = eventService.createEvent({
 *     title: 'Team Meeting',
 *     startTime: '2024-02-15T10:00:00',
 *     endTime: '2024-02-15T11:00:00',
 *     location: 'Conference Room A'
 * });
 *
 * // Add attendees
 * eventService.addAttendee(event.idx, 2, 'required');
 */

// ─────────────────────────────────────────────────────────────────────────────
// Schema Definition
// ─────────────────────────────────────────────────────────────────────────────

const EventServiceSchema = {
    name: 'event',
    prefix: 'evt',
    alias: 'Event Service',
    version: '2.0.0',

    tables: [
        // ─────────────────────────────────────────────────────────────────────
        // EventType - Event categories
        // ─────────────────────────────────────────────────────────────────────
        {
            name: 'eventType',
            alias: 'Event Types',
            primaryKey: 'idx',
            labeller: '{name}',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'name', label: 'Name', type: 'string', required: true },
                { name: 'description', label: 'Description', type: 'text' },
                { name: 'color', label: 'Color', type: 'string', default: '#4285f4' },
                { name: 'icon', label: 'Icon', type: 'string', default: 'calendar' },
                { name: 'defaultDuration', label: 'Default Duration (min)', type: 'integer', default: 60 },
                { name: 'isSystem', label: 'System Type', type: 'boolean', default: false },
                { name: 'sortOrder', label: 'Order', type: 'integer', default: 0 },
                { name: 'createdAt', label: 'Created', type: 'datetime' }
            ]
        },

        // ─────────────────────────────────────────────────────────────────────
        // Event - Main event entity
        // ─────────────────────────────────────────────────────────────────────
        {
            name: 'event',
            alias: 'Events',
            primaryKey: 'idx',
            labeller: '{title}',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'title', label: 'Title', type: 'string', required: true },
                { name: 'description', label: 'Description', type: 'text' },
                { name: 'typeId', label: 'Type', type: 'integer',
                    ref: { table: 'eventType', field: 'idx' } },
                { name: 'status', label: 'Status', type: 'string', default: 'scheduled',
                    options: ['draft', 'scheduled', 'in-progress', 'completed', 'cancelled'] },
                { name: 'startTime', label: 'Start Time', type: 'datetime', required: true },
                { name: 'endTime', label: 'End Time', type: 'datetime' },
                { name: 'allDay', label: 'All Day', type: 'boolean', default: false },
                { name: 'timezone', label: 'Timezone', type: 'string' },
                { name: 'location', label: 'Location', type: 'string' },
                { name: 'locationUrl', label: 'Location URL', type: 'string' },
                { name: 'isOnline', label: 'Online', type: 'boolean', default: false },
                { name: 'meetingUrl', label: 'Meeting URL', type: 'string' },
                { name: 'visibility', label: 'Visibility', type: 'string', default: 'private',
                    options: ['private', 'team', 'public'] },
                { name: 'color', label: 'Color', type: 'string' },
                // Recurrence
                { name: 'isRecurring', label: 'Recurring', type: 'boolean', default: false },
                { name: 'recurrenceRule', label: 'Recurrence Rule', type: 'string' },  // iCal RRULE
                { name: 'recurrenceEndDate', label: 'Recurrence End', type: 'date' },
                { name: 'parentEventId', label: 'Parent Event', type: 'integer',
                    ref: { table: 'event', field: 'idx' } },  // For recurring instances
                // Relations
                { name: 'calendarId', label: 'Calendar', type: 'string' },  // External calendar ID
                { name: 'projectId', label: 'Project', type: 'integer',
                    ref: { service: 'project', table: 'project', field: 'idx' } },
                { name: 'groupId', label: 'Group', type: 'integer',
                    ref: { service: 'group', table: 'group', field: 'idx' } },
                // Metadata
                { name: 'attendeeCount', label: 'Attendees', type: 'integer', default: 0 },
                { name: 'acceptedCount', label: 'Accepted', type: 'integer', default: 0 },
                { name: 'metadata', label: 'Metadata', type: 'json' },
                // Ownership
                { name: 'organizerId', label: 'Organizer', type: 'integer',
                    ref: { service: 'member', table: 'member', field: 'idx' } },
                { name: 'createdBy', label: 'Created By', type: 'integer',
                    ref: { service: 'member', table: 'member', field: 'idx' } },
                { name: 'modifiedBy', label: 'Modified By', type: 'integer',
                    ref: { service: 'member', table: 'member', field: 'idx' } },
                { name: 'createdAt', label: 'Created', type: 'datetime' },
                { name: 'modifiedAt', label: 'Modified', type: 'datetime' }
            ]
        },

        // ─────────────────────────────────────────────────────────────────────
        // EventAttendee - Event participants
        // ─────────────────────────────────────────────────────────────────────
        {
            name: 'eventAttendee',
            alias: 'Event Attendees',
            primaryKey: 'idx',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'eventId', label: 'Event', type: 'integer', required: true,
                    ref: { table: 'event', field: 'idx' } },
                { name: 'memberId', label: 'Member', type: 'integer',
                    ref: { service: 'member', table: 'member', field: 'idx' } },
                { name: 'email', label: 'Email', type: 'string' },  // For external attendees
                { name: 'name', label: 'Name', type: 'string' },  // For external attendees
                { name: 'role', label: 'Role', type: 'string', default: 'attendee',
                    options: ['organizer', 'required', 'optional', 'attendee'] },
                { name: 'rsvpStatus', label: 'RSVP', type: 'string', default: 'pending',
                    options: ['pending', 'accepted', 'declined', 'tentative', 'no-response'] },
                { name: 'rsvpAt', label: 'RSVP Time', type: 'datetime' },
                { name: 'rsvpComment', label: 'RSVP Comment', type: 'text' },
                { name: 'checkedIn', label: 'Checked In', type: 'boolean', default: false },
                { name: 'checkedInAt', label: 'Check-in Time', type: 'datetime' },
                { name: 'notificationSent', label: 'Notification Sent', type: 'boolean', default: false },
                { name: 'createdAt', label: 'Created', type: 'datetime' }
            ]
        },

        // ─────────────────────────────────────────────────────────────────────
        // EventReminder - Scheduled reminders
        // ─────────────────────────────────────────────────────────────────────
        {
            name: 'eventReminder',
            alias: 'Event Reminders',
            primaryKey: 'idx',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'eventId', label: 'Event', type: 'integer', required: true,
                    ref: { table: 'event', field: 'idx' } },
                { name: 'memberId', label: 'Member', type: 'integer',
                    ref: { service: 'member', table: 'member', field: 'idx' } },
                { name: 'reminderType', label: 'Type', type: 'string', default: 'notification',
                    options: ['notification', 'email', 'sms'] },
                { name: 'triggerAt', label: 'Trigger Time', type: 'datetime' },
                { name: 'minutesBefore', label: 'Minutes Before', type: 'integer', default: 15 },
                { name: 'sent', label: 'Sent', type: 'boolean', default: false },
                { name: 'sentAt', label: 'Sent At', type: 'datetime' },
                { name: 'createdAt', label: 'Created', type: 'datetime' }
            ]
        }
    ]
};

// ─────────────────────────────────────────────────────────────────────────────
// Service Class
// ─────────────────────────────────────────────────────────────────────────────

class EventService extends Publome {
    constructor(config = {}) {
        super(EventServiceSchema, config);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // EVENT TYPE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Create an event type
     * @param {Object} data - Event type data
     * @returns {Publon}
     */
    createEventType(data) {
        return this.table('eventType').create({
            ...data,
            createdAt: new Date().toISOString()
        });
    }

    /**
     * Get all event types
     * @returns {Array<Publon>}
     */
    getEventTypes() {
        return this.table('eventType').all()
            .sort((a, b) => (a.get('sortOrder') || 0) - (b.get('sortOrder') || 0));
    }

    /**
     * Get event type by ID
     * @param {number} typeId - Event type idx
     * @returns {Publon|null}
     */
    getEventType(typeId) {
        return this.table('eventType').read(typeId);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // EVENT MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Create an event
     * @param {Object} data - Event data
     * @param {number} [createdBy] - Creator member idx
     * @returns {Publon}
     */
    createEvent(data, createdBy = null) {
        const now = new Date().toISOString();

        // Set end time if not provided
        let endTime = data.endTime;
        if (!endTime && data.startTime && !data.allDay) {
            const start = new Date(data.startTime);
            const type = data.typeId ? this.getEventType(data.typeId) : null;
            const duration = type?.get('defaultDuration') || 60;
            start.setMinutes(start.getMinutes() + duration);
            endTime = start.toISOString();
        }

        const event = this.table('event').create({
            ...data,
            endTime,
            organizerId: createdBy || data.organizerId,
            createdBy,
            modifiedBy: createdBy,
            createdAt: now,
            modifiedAt: now
        });

        // Add organizer as attendee
        if (createdBy) {
            this.addAttendee(event.idx, createdBy, 'organizer');
        }

        return event;
    }

    /**
     * Get event by ID
     * @param {number} eventId - Event idx
     * @returns {Publon|null}
     */
    getEvent(eventId) {
        return this.table('event').read(eventId);
    }

    /**
     * Get events in date range
     * @param {string} startDate - Start date (ISO)
     * @param {string} endDate - End date (ISO)
     * @param {Object} [options] - Filter options
     * @returns {Array<Publon>}
     */
    getEventsInRange(startDate, endDate, options = {}) {
        const start = new Date(startDate);
        const end = new Date(endDate);

        let events = this.table('event').all().filter(e => {
            const eventStart = new Date(e.get('startTime'));
            const eventEnd = e.get('endTime') ? new Date(e.get('endTime')) : eventStart;
            
            // Event overlaps with range
            return eventStart <= end && eventEnd >= start;
        });

        if (options.status) {
            events = events.filter(e => e.get('status') === options.status);
        }

        if (options.typeId) {
            events = events.filter(e => e.get('typeId') === options.typeId);
        }

        if (options.organizerId) {
            events = events.filter(e => e.get('organizerId') === options.organizerId);
        }

        if (options.memberId) {
            const memberEventIds = new Set(
                this.table('eventAttendee').all()
                    .filter(a => a.get('memberId') === options.memberId)
                    .map(a => a.get('eventId'))
            );
            events = events.filter(e => memberEventIds.has(e.idx));
        }

        return events.sort((a, b) => 
            new Date(a.get('startTime')) - new Date(b.get('startTime'))
        );
    }

    /**
     * Get upcoming events
     * @param {number} [limit=10] - Max events
     * @param {number} [memberId] - Filter by member
     * @returns {Array<Publon>}
     */
    getUpcomingEvents(limit = 10, memberId = null) {
        const now = new Date().toISOString();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 365); // Next year

        return this.getEventsInRange(now, endDate.toISOString(), { 
            memberId,
            status: 'scheduled'
        }).slice(0, limit);
    }

    /**
     * Get events for a specific day
     * @param {string} date - Date (YYYY-MM-DD)
     * @param {Object} [options] - Filter options
     * @returns {Array<Publon>}
     */
    getEventsForDay(date, options = {}) {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);

        return this.getEventsInRange(start.toISOString(), end.toISOString(), options);
    }

    /**
     * Get events for a week
     * @param {string} weekStart - Week start date
     * @param {Object} [options] - Filter options
     * @returns {Array<Publon>}
     */
    getEventsForWeek(weekStart, options = {}) {
        const start = new Date(weekStart);
        const end = new Date(weekStart);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);

        return this.getEventsInRange(start.toISOString(), end.toISOString(), options);
    }

    /**
     * Get events for a month
     * @param {number} year - Year
     * @param {number} month - Month (1-12)
     * @param {Object} [options] - Filter options
     * @returns {Array<Publon>}
     */
    getEventsForMonth(year, month, options = {}) {
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0, 23, 59, 59, 999);

        return this.getEventsInRange(start.toISOString(), end.toISOString(), options);
    }

    /**
     * Update event
     * @param {number} eventId - Event idx
     * @param {Object} data - Updated data
     * @param {number} [modifiedBy] - Modifier member idx
     */
    updateEvent(eventId, data, modifiedBy = null) {
        const event = this.table('event').read(eventId);
        if (!event) throw new Error('Event not found');

        Object.entries(data).forEach(([key, value]) => {
            if (key !== 'idx') event.set(key, value);
        });

        event.set('modifiedBy', modifiedBy);
        event.set('modifiedAt', new Date().toISOString());
    }

    /**
     * Update event status
     * @param {number} eventId - Event idx
     * @param {string} status - New status
     * @param {number} [modifiedBy] - Modifier member idx
     */
    updateEventStatus(eventId, status, modifiedBy = null) {
        this.updateEvent(eventId, { status }, modifiedBy);
    }

    /**
     * Cancel an event
     * @param {number} eventId - Event idx
     * @param {number} [modifiedBy] - Modifier member idx
     */
    cancelEvent(eventId, modifiedBy = null) {
        this.updateEventStatus(eventId, 'cancelled', modifiedBy);
    }

    /**
     * Delete an event
     * @param {number} eventId - Event idx
     */
    deleteEvent(eventId) {
        // Delete attendees
        this.table('eventAttendee').all()
            .filter(a => a.get('eventId') === eventId)
            .forEach(a => this.table('eventAttendee').delete(a.idx));

        // Delete reminders
        this.table('eventReminder').all()
            .filter(r => r.get('eventId') === eventId)
            .forEach(r => this.table('eventReminder').delete(r.idx));

        // Delete child events (recurring instances)
        this.table('event').all()
            .filter(e => e.get('parentEventId') === eventId)
            .forEach(e => this.deleteEvent(e.idx));

        // Delete event
        this.table('event').delete(eventId);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ATTENDEE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Add attendee to event
     * @param {number} eventId - Event idx
     * @param {number|Object} memberIdOrData - Member idx or attendee data
     * @param {string} [role='attendee'] - Attendee role
     * @returns {Publon}
     */
    addAttendee(eventId, memberIdOrData, role = 'attendee') {
        const data = typeof memberIdOrData === 'object' 
            ? memberIdOrData 
            : { memberId: memberIdOrData };

        // Check if already an attendee
        const existing = this.table('eventAttendee').all().find(a =>
            a.get('eventId') === eventId &&
            ((data.memberId && a.get('memberId') === data.memberId) || 
             (data.email && a.get('email') === data.email))
        );

        if (existing) {
            // Update role if different
            if (existing.get('role') !== (data.role || role)) {
                existing.set('role', data.role || role);
            }
            return existing;
        }

        const attendee = this.table('eventAttendee').create({
            eventId,
            ...data,
            role: data.role || role,
            createdAt: new Date().toISOString()
        });

        // Update attendee count
        this._updateAttendeeCounts(eventId);

        return attendee;
    }

    /**
     * Add multiple attendees
     * @param {number} eventId - Event idx
     * @param {number[]} memberIds - Array of member IDs
     * @param {string} [role='attendee'] - Role for all attendees
     * @returns {Array<Publon>}
     */
    addAttendees(eventId, memberIds, role = 'attendee') {
        return memberIds.map(memberId => this.addAttendee(eventId, memberId, role));
    }

    /**
     * Get attendees for event
     * @param {number} eventId - Event idx
     * @returns {Array<Publon>}
     */
    getEventAttendees(eventId) {
        return this.table('eventAttendee').all()
            .filter(a => a.get('eventId') === eventId);
    }

    /**
     * Update RSVP status
     * @param {number} eventId - Event idx
     * @param {number} memberId - Member idx
     * @param {string} status - RSVP status
     * @param {string} [comment] - Optional comment
     */
    updateRsvp(eventId, memberId, status, comment = null) {
        const attendee = this.table('eventAttendee').all().find(a =>
            a.get('eventId') === eventId && a.get('memberId') === memberId
        );

        if (!attendee) {
            throw new Error('Attendee not found');
        }

        attendee.set('rsvpStatus', status);
        attendee.set('rsvpAt', new Date().toISOString());
        if (comment) attendee.set('rsvpComment', comment);

        // Update accepted count
        this._updateAttendeeCounts(eventId);
    }

    /**
     * Check in attendee
     * @param {number} eventId - Event idx
     * @param {number} memberId - Member idx
     */
    checkInAttendee(eventId, memberId) {
        const attendee = this.table('eventAttendee').all().find(a =>
            a.get('eventId') === eventId && a.get('memberId') === memberId
        );

        if (attendee) {
            attendee.set('checkedIn', true);
            attendee.set('checkedInAt', new Date().toISOString());
        }
    }

    /**
     * Remove attendee from event
     * @param {number} eventId - Event idx
     * @param {number} memberId - Member idx
     */
    removeAttendee(eventId, memberId) {
        const attendee = this.table('eventAttendee').all().find(a =>
            a.get('eventId') === eventId && a.get('memberId') === memberId
        );

        if (attendee) {
            this.table('eventAttendee').delete(attendee.idx);
            this._updateAttendeeCounts(eventId);
        }
    }

    /**
     * Get events for a member
     * @param {number} memberId - Member idx
     * @param {Object} [options] - Filter options
     * @returns {Array<Publon>}
     */
    getMemberEvents(memberId, options = {}) {
        const attendeeRecords = this.table('eventAttendee').all()
            .filter(a => a.get('memberId') === memberId);

        if (options.rsvpStatus) {
            attendeeRecords.filter(a => a.get('rsvpStatus') === options.rsvpStatus);
        }

        const eventIds = new Set(attendeeRecords.map(a => a.get('eventId')));
        let events = this.table('event').all()
            .filter(e => eventIds.has(e.idx));

        if (options.upcoming) {
            const now = new Date();
            events = events.filter(e => new Date(e.get('startTime')) >= now);
        }

        return events.sort((a, b) => 
            new Date(a.get('startTime')) - new Date(b.get('startTime'))
        );
    }

    /**
     * Update attendee counts
     * @private
     */
    _updateAttendeeCounts(eventId) {
        const event = this.table('event').read(eventId);
        if (!event) return;

        const attendees = this.getEventAttendees(eventId);
        event.set('attendeeCount', attendees.length);
        event.set('acceptedCount', 
            attendees.filter(a => a.get('rsvpStatus') === 'accepted').length
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // REMINDERS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Add reminder for event
     * @param {number} eventId - Event idx
     * @param {number} minutesBefore - Minutes before event
     * @param {string} [type='notification'] - Reminder type
     * @param {number} [memberId] - Specific member (null for all attendees)
     * @returns {Publon}
     */
    addReminder(eventId, minutesBefore, type = 'notification', memberId = null) {
        const event = this.table('event').read(eventId);
        if (!event) throw new Error('Event not found');

        const eventTime = new Date(event.get('startTime'));
        const triggerAt = new Date(eventTime.getTime() - minutesBefore * 60 * 1000);

        return this.table('eventReminder').create({
            eventId,
            memberId,
            reminderType: type,
            minutesBefore,
            triggerAt: triggerAt.toISOString(),
            createdAt: new Date().toISOString()
        });
    }

    /**
     * Get reminders for event
     * @param {number} eventId - Event idx
     * @returns {Array<Publon>}
     */
    getEventReminders(eventId) {
        return this.table('eventReminder').all()
            .filter(r => r.get('eventId') === eventId);
    }

    /**
     * Get pending reminders
     * @param {Date} [upTo] - Get reminders up to this time
     * @returns {Array<Publon>}
     */
    getPendingReminders(upTo = new Date()) {
        return this.table('eventReminder').all()
            .filter(r => 
                !r.get('sent') && 
                new Date(r.get('triggerAt')) <= upTo
            );
    }

    /**
     * Mark reminder as sent
     * @param {number} reminderId - Reminder idx
     */
    markReminderSent(reminderId) {
        const reminder = this.table('eventReminder').read(reminderId);
        if (reminder) {
            reminder.set('sent', true);
            reminder.set('sentAt', new Date().toISOString());
        }
    }

    /**
     * Delete reminder
     * @param {number} reminderId - Reminder idx
     */
    deleteReminder(reminderId) {
        this.table('eventReminder').delete(reminderId);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // RECURRENCE
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Create recurring event
     * @param {Object} data - Event data with recurrence
     * @param {number} [createdBy] - Creator member idx
     * @returns {Publon} Parent event
     */
    createRecurringEvent(data, createdBy = null) {
        const event = this.createEvent({
            ...data,
            isRecurring: true
        }, createdBy);

        return event;
    }

    /**
     * Generate recurring instances
     * @param {number} parentEventId - Parent event idx
     * @param {string} endDate - Generate up to this date
     * @returns {Array<Publon>} Generated instances
     */
    generateRecurringInstances(parentEventId, endDate) {
        const parent = this.table('event').read(parentEventId);
        if (!parent || !parent.get('isRecurring')) {
            throw new Error('Event is not recurring');
        }

        // Simple implementation - extend with proper RRULE parsing
        const rule = parent.get('recurrenceRule') || 'FREQ=WEEKLY';
        const instances = [];
        
        let currentDate = new Date(parent.get('startTime'));
        const end = new Date(endDate);
        const recurrenceEnd = parent.get('recurrenceEndDate') 
            ? new Date(parent.get('recurrenceEndDate'))
            : end;

        const finalEnd = recurrenceEnd < end ? recurrenceEnd : end;

        // Parse simple rules
        const freq = rule.match(/FREQ=(\w+)/)?.[1] || 'WEEKLY';
        const interval = parseInt(rule.match(/INTERVAL=(\d+)/)?.[1] || '1');

        while (currentDate <= finalEnd) {
            // Skip the first date (parent event)
            if (currentDate.toISOString() !== parent.get('startTime')) {
                const instance = this.table('event').create({
                    title: parent.get('title'),
                    description: parent.get('description'),
                    typeId: parent.get('typeId'),
                    startTime: currentDate.toISOString(),
                    endTime: this._calculateEndTime(currentDate, parent),
                    location: parent.get('location'),
                    isOnline: parent.get('isOnline'),
                    meetingUrl: parent.get('meetingUrl'),
                    parentEventId,
                    organizerId: parent.get('organizerId'),
                    createdBy: parent.get('createdBy'),
                    createdAt: new Date().toISOString()
                });
                instances.push(instance);
            }

            // Move to next occurrence
            switch (freq) {
                case 'DAILY':
                    currentDate.setDate(currentDate.getDate() + interval);
                    break;
                case 'WEEKLY':
                    currentDate.setDate(currentDate.getDate() + (7 * interval));
                    break;
                case 'MONTHLY':
                    currentDate.setMonth(currentDate.getMonth() + interval);
                    break;
                case 'YEARLY':
                    currentDate.setFullYear(currentDate.getFullYear() + interval);
                    break;
            }
        }

        return instances;
    }

    /**
     * Calculate end time based on parent duration
     * @private
     */
    _calculateEndTime(startTime, parentEvent) {
        const parentStart = new Date(parentEvent.get('startTime'));
        const parentEnd = new Date(parentEvent.get('endTime'));
        const duration = parentEnd - parentStart;
        return new Date(startTime.getTime() + duration).toISOString();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SEARCH & STATISTICS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Search events
     * @param {string} query - Search query
     * @returns {Array<Publon>}
     */
    searchEvents(query) {
        const q = query.toLowerCase();
        return this.table('event').all().filter(e => {
            const title = (e.get('title') || '').toLowerCase();
            const desc = (e.get('description') || '').toLowerCase();
            const location = (e.get('location') || '').toLowerCase();
            return title.includes(q) || desc.includes(q) || location.includes(q);
        });
    }

    /**
     * Get event statistics for a member
     * @param {number} memberId - Member idx
     * @returns {Object}
     */
    getMemberEventStats(memberId) {
        const attendeeRecords = this.table('eventAttendee').all()
            .filter(a => a.get('memberId') === memberId);

        const eventIds = new Set(attendeeRecords.map(a => a.get('eventId')));
        const events = this.table('event').all().filter(e => eventIds.has(e.idx));

        const now = new Date();
        const upcoming = events.filter(e => new Date(e.get('startTime')) >= now);
        const past = events.filter(e => new Date(e.get('startTime')) < now);

        const rsvpStats = {};
        attendeeRecords.forEach(a => {
            const status = a.get('rsvpStatus');
            rsvpStats[status] = (rsvpStats[status] || 0) + 1;
        });

        return {
            total: events.length,
            upcoming: upcoming.length,
            past: past.length,
            organized: events.filter(e => e.get('organizerId') === memberId).length,
            rsvpStats
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SEED DATA
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Load default seed data
     */

    // ─────────────────────────────────────────────────────────────────────────
    // API Binding
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Connect to a REST API for data synchronization.
     * Wires ApiBinding on all tables so CRUD operations sync to the server.
     *
     * @param {Object} config - API configuration
     * @param {string} config.apiUrl - Base API URL (e.g. 'https://api.example.com')
     * @param {string} [config.apiToken] - Authentication token
     * @param {string} [config.apiEndpoint='/api/v1/event'] - Base endpoint path
     * @returns {Object} Map of table name → ApiBinding instance
     */
    connectApi(config = {}) {
        if (!config.apiUrl) throw new Error('apiUrl is required');
        const baseEndpoint = config.apiEndpoint || '/api/v1/event';
        const bindings = {};

        ['eventType', 'event', 'eventAttendee', 'eventReminder'].forEach(tableName => {
            bindings[tableName] = new ApiBinding(this.table(tableName), {
                apiUrl: config.apiUrl,
                endpoint: `${baseEndpoint}/${tableName}`,
                apiToken: config.apiToken
            });
        });

        return bindings;
    }

    seedDefaults() {
        const types = this.table('eventType');

        if (types.all().length === 0) {
            // Create default event types
            this.createEventType({ name: 'Meeting', color: '#4285f4', icon: 'users', defaultDuration: 60, isSystem: true });
            this.createEventType({ name: 'Appointment', color: '#0f9d58', icon: 'user', defaultDuration: 30, isSystem: true });
            this.createEventType({ name: 'Reminder', color: '#f4b400', icon: 'bell', defaultDuration: 15, isSystem: true });
            this.createEventType({ name: 'Deadline', color: '#db4437', icon: 'flag', defaultDuration: 0, isSystem: true });
            this.createEventType({ name: 'Event', color: '#ab47bc', icon: 'calendar', defaultDuration: 120, isSystem: true });

            // Create sample events
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            this.createEvent({
                title: 'Team Standup',
                description: 'Daily team sync meeting',
                typeId: 1,
                startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0).toISOString(),
                endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 30).toISOString(),
                location: 'Conference Room A',
                isRecurring: true,
                recurrenceRule: 'FREQ=DAILY'
            }, 1);

            this.createEvent({
                title: 'Project Review',
                description: 'Weekly project status review',
                typeId: 1,
                startTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 14, 0).toISOString(),
                endTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 15, 0).toISOString(),
                location: 'Meeting Room B'
            }, 1);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Binding Registry & Capability Discovery
    // ─────────────────────────────────────────────────────────────────────────

    getBindingRegistry() {
        const svc = this;
        return [
            {
                key: 'calendarView',
                label: 'Calendar',
                description: 'Monthly calendar view with color-coded events by type.',
                type: 'specialized',
                tables: ['event', 'eventType'],
                methods: [],
                tags: ['calendar', 'schedule', 'visualization'],
                intent: 'View events on a monthly calendar grid.',
                builder: (svc, container) => {
                    const now = new Date();
                    const eventTypes = {};
                    svc.table('eventType').all().forEach(et => { eventTypes[et.idx] = et; });
                    const events = svc.table('event').all().map(ev => {
                        const start = ev.get('startTime') || '';
                        const et = eventTypes[ev.get('typeId')];
                        return { date: start.substring(0, 10), title: ev.get('title'), time: start.substring(11, 16), color: et ? et.get('color') : '#3b82f6' };
                    });
                    new uiCalendar({ parent: container, year: now.getFullYear(), month: now.getMonth() + 1, events });
                }
            },
            {
                key: 'eventCollection',
                label: 'Events',
                description: 'Flat collection view of all events.',
                type: 'collection',
                tables: ['event'],
                methods: ['bindSelectEditor'],
                tags: ['browse', 'crud', 'events'],
                intent: 'List and manage all events in a flat table.',
                builder: null
            }
        ];
    }

    getCapabilities() {
        return {
            name: 'event',
            alias: 'Event Service',
            icon: 'fa-calendar-alt',
            intent: 'Calendar event management with scheduling, attendees, reminders, and recurrence support.',
            keywords: ['event', 'calendar', 'schedule', 'meeting', 'attendee', 'rsvp', 'reminder', 'recurring'],
            capabilities: ['event types', 'date-range queries', 'attendee management', 'RSVP tracking', 'check-in', 'reminders', 'recurring events', 'search', 'member event stats'],
            useCases: [
                'Team meeting scheduling and calendar management',
                'Conference and workshop event planning',
                'Recurring event generation (daily, weekly, monthly)',
                'Attendee RSVP tracking and check-in'
            ],
            consumers: [],
            domainMethods: [
                { name: 'createEventType', signature: '(data)', description: 'Create an event type' },
                { name: 'getEventTypes', signature: '()', description: 'Get all event types sorted by order' },
                { name: 'getEventType', signature: '(typeId)', description: 'Get event type by ID' },
                { name: 'createEvent', signature: '(data, createdBy)', description: 'Create an event with auto end-time' },
                { name: 'getEvent', signature: '(eventId)', description: 'Get event by ID' },
                { name: 'getEventsInRange', signature: '(startDate, endDate, options)', description: 'Get events in date range' },
                { name: 'getUpcomingEvents', signature: '(limit, memberId)', description: 'Get upcoming events' },
                { name: 'getEventsForDay', signature: '(date, options)', description: 'Get events for a specific day' },
                { name: 'getEventsForWeek', signature: '(weekStart, options)', description: 'Get events for a week' },
                { name: 'getEventsForMonth', signature: '(year, month, options)', description: 'Get events for a month' },
                { name: 'updateEvent', signature: '(eventId, data, modifiedBy)', description: 'Update event data' },
                { name: 'updateEventStatus', signature: '(eventId, status, modifiedBy)', description: 'Update event status' },
                { name: 'cancelEvent', signature: '(eventId, modifiedBy)', description: 'Cancel an event' },
                { name: 'deleteEvent', signature: '(eventId)', description: 'Delete an event and related data' },
                { name: 'addAttendee', signature: '(eventId, memberIdOrData, role)', description: 'Add attendee to event' },
                { name: 'addAttendees', signature: '(eventId, memberIds, role)', description: 'Add multiple attendees' },
                { name: 'getEventAttendees', signature: '(eventId)', description: 'Get attendees for event' },
                { name: 'updateRsvp', signature: '(eventId, memberId, status, comment)', description: 'Update RSVP status' },
                { name: 'checkInAttendee', signature: '(eventId, memberId)', description: 'Check in attendee' },
                { name: 'removeAttendee', signature: '(eventId, memberId)', description: 'Remove attendee from event' },
                { name: 'getMemberEvents', signature: '(memberId, options)', description: 'Get events for a member' },
                { name: 'addReminder', signature: '(eventId, minutesBefore, type, memberId)', description: 'Add reminder for event' },
                { name: 'getEventReminders', signature: '(eventId)', description: 'Get reminders for event' },
                { name: 'getPendingReminders', signature: '(upTo)', description: 'Get pending reminders' },
                { name: 'markReminderSent', signature: '(reminderId)', description: 'Mark reminder as sent' },
                { name: 'deleteReminder', signature: '(reminderId)', description: 'Delete reminder' },
                { name: 'createRecurringEvent', signature: '(data, createdBy)', description: 'Create recurring event' },
                { name: 'generateRecurringInstances', signature: '(parentEventId, endDate)', description: 'Generate recurring instances' },
                { name: 'searchEvents', signature: '(query)', description: 'Search events by title/description/location' },
                { name: 'getMemberEventStats', signature: '(memberId)', description: 'Get event statistics for a member' }
            ],
            bindings: this.getBindingRegistry()
        };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EventService, EventServiceSchema };
}
