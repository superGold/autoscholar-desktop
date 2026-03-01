/**
 * CaseworkSeed - Demo seed data for CaseworkService
 *
 * Provides realistic DUT-context sample data for casework counselling:
 * 6 categories, 15 cases, 12 interventions, 8 referrals, 8 case notes,
 * 10 appointments, 54 risk snapshots (all 10 students).
 *
 * Student IDs reference the sample student data in the panel.
 */

const CaseworkSeed = {
    data: {
        // ─────────────────────────────────────────────────────────────────
        // Case Categories (6)
        // ─────────────────────────────────────────────────────────────────
        caseCategory: [
            { idx: 1, name: 'Academic',      description: 'Academic performance, attendance, and progression issues',    color: 'var(--ui-primary)', icon: 'book',               sortOrder: 1 },
            { idx: 2, name: 'Personal',      description: 'Personal circumstances affecting studies',                   color: 'var(--ui-secondary)', icon: 'user',               sortOrder: 2 },
            { idx: 3, name: 'Financial',     description: 'Funding, fees, bursaries, and financial hardship',           color: 'var(--ui-warning)', icon: 'wallet',             sortOrder: 3 },
            { idx: 4, name: 'Health',        description: 'Physical or mental health concerns',                         color: 'var(--ui-danger)', icon: 'heartbeat',          sortOrder: 4 },
            { idx: 5, name: 'Career',        description: 'Career guidance, WIL placements, and employability',         color: 'var(--ui-success)', icon: 'briefcase',          sortOrder: 5 },
            { idx: 6, name: 'Disciplinary',  description: 'Academic misconduct and disciplinary matters',               color: 'var(--ui-gray-500)', icon: 'exclamation-triangle', sortOrder: 6 }
        ],

        // ─────────────────────────────────────────────────────────────────
        // Cases (10)
        // ─────────────────────────────────────────────────────────────────
        case: [
            // Open (4)
            { idx: 1,  studentId: 1,  categoryId: 1, status: 'Open',           priority: 'High',     title: 'Failing 3 out of 5 modules',            description: 'Student failing 3 out of 5 modules. Has missed multiple tutorials. Requested academic advising session.',                          counsellorId: 1, dateOpened: '2026-02-12', dateClosed: null, daysOpen: 3 },
            { idx: 2,  studentId: 2,  categoryId: 3, status: 'Open',           priority: 'Critical', title: 'NSFAS funding blocked — N+2 breach',    description: 'NSFAS funding blocked due to N+2 rule breach. Student unable to pay registration fee. Needs urgent financial aid referral.',       counsellorId: 2, dateOpened: '2026-02-14', dateClosed: null, daysOpen: 1 },
            { idx: 3,  studentId: 3,  categoryId: 2, status: 'Open',           priority: 'High',     title: 'Bereavement — lost primary caregiver',  description: 'Family bereavement — lost primary caregiver. Requesting special consideration for missed tests.',                                  counsellorId: 1, dateOpened: '2026-02-10', dateClosed: null, daysOpen: 5 },
            { idx: 4,  studentId: 4,  categoryId: 1, status: 'Open',           priority: 'Medium',   title: 'DP exclusion risk for MATH201',         description: 'DP exclusion risk for MATH201 — attendance at 62%. Needs intervention before 80% threshold deadline.',                             counsellorId: 3, dateOpened: '2026-02-07', dateClosed: null, daysOpen: 8 },

            // In Progress (3)
            { idx: 5,  studentId: 5,  categoryId: 6, status: 'In Progress',    priority: 'Medium',   title: 'Academic misconduct investigation',      description: 'Suspected plagiarism in PROG201 project. Awaiting hearing date.',                                                                  counsellorId: 2, dateOpened: '2026-02-03', dateClosed: null, daysOpen: 12 },
            { idx: 6,  studentId: 6,  categoryId: 5, status: 'In Progress',    priority: 'Low',      title: 'Career guidance — specialisation path',  description: 'Student unsure about specialisation path (software dev vs data science). Running aptitude assessment.',                             counsellorId: 3, dateOpened: '2026-01-31', dateClosed: null, daysOpen: 15 },
            { idx: 7,  studentId: 7,  categoryId: 4, status: 'In Progress',    priority: 'High',     title: 'Chronic health condition',               description: 'Chronic health condition affecting attendance. Medical certificates submitted. Coordinating with Health Services.',                  counsellorId: 1, dateOpened: '2026-02-05', dateClosed: null, daysOpen: 10 },

            // Pending Review (1)
            { idx: 8,  studentId: 8,  categoryId: 1, status: 'Pending Review', priority: 'Medium',   title: 'Supplementary exam arrangement',         description: 'Supplementary exam arrangement for ACCT301. Student met remediation requirements. Awaiting HoD approval.',                         counsellorId: 3, dateOpened: '2026-01-21', dateClosed: null, daysOpen: 25 },

            // Resolved (2)
            { idx: 9,  studentId: 9,  categoryId: 1, status: 'Resolved',       priority: 'High',     title: 'At-risk academic support completed',     description: 'At-risk academic support programme completed. Student improved from 38% to 62% average across 4 modules.',                         counsellorId: 2, dateOpened: '2026-01-01', dateClosed: '2026-02-10', daysOpen: 45 },
            { idx: 10, studentId: 10, categoryId: 3, status: 'Resolved',       priority: 'Critical', title: 'Emergency financial assistance',          description: 'Student could not afford transport to campus. Connected with emergency bursary fund. R3,000 grant approved.',                       counsellorId: 1, dateOpened: '2026-01-10', dateClosed: '2026-02-01', daysOpen: 35 },

            // Additional cases (5 more for richer dataset)
            { idx: 11, studentId: 1,  categoryId: 4, status: 'Open',           priority: 'High',     title: 'Anxiety affecting exam performance',     description: 'Student reports severe anxiety before exams. Missed two supplementary opportunities. Requesting psychological referral.',           counsellorId: 1, dateOpened: '2026-02-18', dateClosed: null, daysOpen: 2 },
            { idx: 12, studentId: 3,  categoryId: 1, status: 'In Progress',    priority: 'Medium',   title: 'Academic catch-up plan post-bereavement', description: 'Creating structured catch-up plan for missed assessments. Coordinating with 3 lecturers.',                                          counsellorId: 1, dateOpened: '2026-02-16', dateClosed: null, daysOpen: 4 },
            { idx: 13, studentId: 4,  categoryId: 5, status: 'Open',           priority: 'Low',      title: 'WIL placement enquiry',                   description: 'Student needs WIL placement for 2027. Exploring industry contacts in civil engineering.',                                          counsellorId: 3, dateOpened: '2026-02-19', dateClosed: null, daysOpen: 1 },
            { idx: 14, studentId: 7,  categoryId: 1, status: 'Open',           priority: 'High',     title: 'DP warning — 3 modules at risk',          description: 'Chronic illness causing DP risk in MECH201, MECH203, PHYS201. Need accommodation letters urgently.',                               counsellorId: 1, dateOpened: '2026-02-17', dateClosed: null, daysOpen: 3 },
            { idx: 15, studentId: 2,  categoryId: 2, status: 'In Progress',    priority: 'Medium',   title: 'Housing instability',                     description: 'Student lost accommodation. Sleeping at friends. Referred to SRC housing assistance programme.',                                   counsellorId: 2, dateOpened: '2026-02-15', dateClosed: null, daysOpen: 5 }
        ],

        // ─────────────────────────────────────────────────────────────────
        // Interventions (8)
        // ─────────────────────────────────────────────────────────────────
        intervention: [
            { idx: 1, caseId: 1,  studentId: 1, type: 'Meeting',       outcome: 'Pending',   date: '2026-02-14', counsellorId: 1, notes: 'Initial academic advising session. Discussed study strategies and time management. Student agreed to attend all tutorials from next week.' },
            { idx: 2, caseId: 2,  studentId: 2, type: 'Referral',      outcome: 'Pending',   date: '2026-02-13', counsellorId: 2, notes: 'Referred to Financial Aid Office for NSFAS appeal process. Emergency funding application submitted.' },
            { idx: 3, caseId: 3,  studentId: 3, type: 'Meeting',       outcome: 'Improved',  date: '2026-02-12', counsellorId: 1, notes: 'Bereavement support session. Student calmer than last week. Connected with counselling centre grief support group.' },
            { idx: 4, caseId: 5,  studentId: 5, type: 'Email',         outcome: 'Unchanged', date: '2026-02-11', counsellorId: 2, notes: 'Sent formal notification about academic misconduct hearing date and student rights.' },
            { idx: 5, caseId: 4,  studentId: 4, type: 'Phone Call',    outcome: 'Improved',  date: '2026-02-10', counsellorId: 3, notes: 'Called to discuss DP status. Student was unaware of 80% threshold. Committed to attending remaining sessions.' },
            { idx: 6, caseId: 7,  studentId: 7, type: 'Referral',      outcome: 'Pending',   date: '2026-02-07', counsellorId: 1, notes: 'Referred to Health Services for chronic condition management plan. Requested accommodation letter for lecturers.' },
            { idx: 7, caseId: 9,  studentId: 9, type: 'Peer Tutoring', outcome: 'Improved',  date: '2026-02-06', counsellorId: 2, notes: 'Matched with senior student tutor for PROG201. First session completed — student reports better understanding of OOP concepts.' },
            { idx: 8, caseId: 6,  studentId: 6, type: 'Workshop',      outcome: 'Improved',  date: '2026-02-05', counsellorId: 3, notes: 'Attended career orientation workshop. Completed Holland code assessment and strengths inventory.' },
            { idx: 9,  caseId: 11, studentId: 1, type: 'Referral',      outcome: 'Pending',   date: '2026-02-19', counsellorId: 1, notes: 'Referred to Student Counselling Centre for anxiety assessment and management.' },
            { idx: 10, caseId: 14, studentId: 7, type: 'Email',         outcome: 'Pending',   date: '2026-02-18', counsellorId: 1, notes: 'Sent accommodation request letters to MECH201, MECH203, PHYS201 lecturers.' },
            { idx: 11, caseId: 15, studentId: 2, type: 'Meeting',       outcome: 'Improved',  date: '2026-02-16', counsellorId: 2, notes: 'Met with SRC housing coordinator. Temporary accommodation arranged in res.' },
            { idx: 12, caseId: 12, studentId: 3, type: 'Meeting',       outcome: 'Improved',  date: '2026-02-17', counsellorId: 1, notes: 'Met with 2 of 3 lecturers. Extended deadlines agreed for ELEC201 and MATH201.' }
        ],

        // ─────────────────────────────────────────────────────────────────
        // Referrals (5)
        // ─────────────────────────────────────────────────────────────────
        referral: [
            { idx: 1, caseId: 3,  studentId: 3,  service: 'Counselling Centre',   reason: 'Bereavement grief support',                     status: 'Attended', priority: 'High',   date: '2026-02-10', counsellorId: 1, notes: 'Student attended initial grief counselling session. Follow-up scheduled.' },
            { idx: 2, caseId: 2,  studentId: 2,  service: 'Financial Aid Office', reason: 'NSFAS appeal and emergency funding',             status: 'Pending',  priority: 'High',   date: '2026-02-13', counsellorId: 2, notes: 'Appeal documentation submitted. Awaiting response from NSFAS office.' },
            { idx: 3, caseId: 7,  studentId: 7,  service: 'Health Services',      reason: 'Chronic condition management plan',              status: 'Attended', priority: 'Medium', date: '2026-02-07', counsellorId: 1, notes: 'Health Services provided management plan and accommodation letter.' },
            { idx: 4, caseId: 1,  studentId: 1,  service: 'Writing Centre',       reason: 'Academic writing skills development',            status: 'Pending',  priority: 'Low',    date: '2026-02-14', counsellorId: 1, notes: 'Appointment booked for initial writing assessment.' },
            { idx: 5, caseId: 5,  studentId: 5,  service: 'Disability Unit',      reason: 'Assessment of suspected learning difficulty',    status: 'Attended', priority: 'Medium', date: '2026-01-28', counsellorId: 2, notes: 'Assessment completed. Report pending.' },
            { idx: 6, caseId: 11, studentId: 1,  service: 'Counselling Centre',   reason: 'Exam anxiety assessment and CBT referral',       status: 'Pending',  priority: 'High',   date: '2026-02-19', counsellorId: 1, notes: 'Urgent referral for anxiety management before March exams.' },
            { idx: 7, caseId: 15, studentId: 2,  service: 'SRC Housing',          reason: 'Emergency accommodation assistance',             status: 'Attended', priority: 'High',   date: '2026-02-16', counsellorId: 2, notes: 'SRC arranged temporary res accommodation.' },
            { idx: 8, caseId: 14, studentId: 7,  service: 'Disability Unit',      reason: 'Chronic condition accommodation letters',        status: 'Pending',  priority: 'Medium', date: '2026-02-18', counsellorId: 1, notes: 'Accommodation letters requested for extended test time.' }
        ],

        // ─────────────────────────────────────────────────────────────────
        // Case Notes (8)
        // ─────────────────────────────────────────────────────────────────
        caseNote: [
            { idx: 1, caseId: 1,  author: 'Dr. N. Mabaso',  text: 'Initial contact made via email. Student acknowledged difficulties.',                                         date: '2026-02-12' },
            { idx: 2, caseId: 3,  author: 'Dr. N. Mabaso',  text: 'Met with student. Very distressed. Referred to counselling centre.',                                          date: '2026-02-10' },
            { idx: 3, caseId: 5,  author: 'Ms. T. Dlamini', text: 'Evidence collected. Meeting with HoD scheduled for next week.',                                               date: '2026-02-05' },
            { idx: 4, caseId: 5,  author: 'Ms. T. Dlamini', text: 'Student provided explanation. Hearing scheduled for 2026-02-20.',                                             date: '2026-02-08' },
            { idx: 5, caseId: 8,  author: 'Mr. R. Singh',   text: 'Student completed all tutorial submissions as required.',                                                      date: '2026-01-25' },
            { idx: 6, caseId: 8,  author: 'Mr. R. Singh',   text: 'Submitted supplementary request to exam office. Awaiting confirmation.',                                       date: '2026-02-10' },
            { idx: 7, caseId: 9,  author: 'Ms. T. Dlamini', text: 'Enrolled student in peer tutoring programme.',                                                                 date: '2025-12-15' },
            { idx: 8, caseId: 10, author: 'Dr. N. Mabaso',  text: 'Emergency fund application submitted. R3,000 grant approved. Student resumed attendance.',                     date: '2026-01-15' }
        ],

        // ─────────────────────────────────────────────────────────────────
        // Appointments (10)
        // ─────────────────────────────────────────────────────────────────
        appointment: [
            { idx: 1,  studentId: 1,  caseId: 1,  counsellorId: 1, type: 'Follow-up',            date: '2026-02-20', time: '09:00', duration: 30, location: 'Office B3-201',  status: 'Scheduled', notes: 'Review tutorial attendance progress' },
            { idx: 2,  studentId: 2,  caseId: 2,  counsellorId: 2, type: 'Emergency',            date: '2026-02-20', time: '10:00', duration: 45, location: 'Office B3-202',  status: 'Confirmed', notes: 'NSFAS appeal outcome discussion' },
            { idx: 3,  studentId: 3,  caseId: 3,  counsellorId: 1, type: 'Follow-up',            date: '2026-02-20', time: '11:00', duration: 30, location: 'Office B3-201',  status: 'Confirmed', notes: 'Bereavement support check-in' },
            { idx: 4,  studentId: 5,  caseId: 5,  counsellorId: 2, type: 'Initial Consultation', date: '2026-02-21', time: '09:30', duration: 60, location: 'Office B3-202',  status: 'Scheduled', notes: 'Pre-hearing preparation' },
            { idx: 5,  studentId: 7,  caseId: 7,  counsellorId: 1, type: 'Follow-up',            date: '2026-02-21', time: '14:00', duration: 30, location: 'MS Teams',       status: 'Scheduled', notes: 'Health accommodation letter review' },
            { idx: 6,  studentId: 4,  caseId: 4,  counsellorId: 3, type: 'Academic Review',      date: '2026-02-22', time: '10:00', duration: 45, location: 'Office B3-203',  status: 'Scheduled', notes: 'MATH201 DP recovery plan' },
            { idx: 7,  studentId: 6,  caseId: 6,  counsellorId: 3, type: 'Career Guidance',      date: '2026-02-22', time: '14:30', duration: 60, location: 'Office B3-203',  status: 'Scheduled', notes: 'Aptitude results review' },
            { idx: 8,  studentId: 1,  caseId: 11, counsellorId: 1, type: 'Emergency',            date: '2026-02-20', time: '14:00', duration: 30, location: 'Office B3-201',  status: 'Confirmed', notes: 'Anxiety management before test week' },
            { idx: 9,  studentId: 9,  caseId: 9,  counsellorId: 2, type: 'Follow-up',            date: '2026-02-19', time: '11:00', duration: 30, location: 'Office B3-202',  status: 'Completed', notes: 'Final check-in — case closure' },
            { idx: 10, studentId: 8,  caseId: 8,  counsellorId: 3, type: 'Academic Review',      date: '2026-02-18', time: '09:00', duration: 30, location: 'Office B3-203',  status: 'No-Show',   notes: 'Student did not attend — follow-up needed' }
        ],

        // ─────────────────────────────────────────────────────────────────
        // Risk Snapshots (35) — weekly risk scores for 7 students
        // ─────────────────────────────────────────────────────────────────
        riskSnapshot: [
            // Student 1 — Sipho Nkosi (rising risk)
            { idx: 1,  studentId: 1, date: '2026-01-06', riskScore: 35, source: 'Academic' },
            { idx: 2,  studentId: 1, date: '2026-01-13', riskScore: 42, source: 'Academic' },
            { idx: 3,  studentId: 1, date: '2026-01-20', riskScore: 55, source: 'Composite' },
            { idx: 4,  studentId: 1, date: '2026-01-27', riskScore: 68, source: 'Academic' },
            { idx: 5,  studentId: 1, date: '2026-02-03', riskScore: 72, source: 'Composite' },
            { idx: 6,  studentId: 1, date: '2026-02-10', riskScore: 78, source: 'Academic' },
            { idx: 7,  studentId: 1, date: '2026-02-17', riskScore: 82, source: 'Composite' },
            // Student 2 — Priya Govender (spike then plateau)
            { idx: 8,  studentId: 2, date: '2026-01-06', riskScore: 20, source: 'Financial' },
            { idx: 9,  studentId: 2, date: '2026-01-13', riskScore: 25, source: 'Financial' },
            { idx: 10, studentId: 2, date: '2026-01-20', riskScore: 30, source: 'Financial' },
            { idx: 11, studentId: 2, date: '2026-01-27', riskScore: 65, source: 'Financial' },
            { idx: 12, studentId: 2, date: '2026-02-03', riskScore: 85, source: 'Financial' },
            { idx: 13, studentId: 2, date: '2026-02-10', riskScore: 90, source: 'Composite' },
            { idx: 14, studentId: 2, date: '2026-02-17', riskScore: 88, source: 'Composite' },
            // Student 3 — Thabo Molefe (stable-high)
            { idx: 15, studentId: 3, date: '2026-01-06', riskScore: 55, source: 'Composite' },
            { idx: 16, studentId: 3, date: '2026-01-13', riskScore: 58, source: 'Composite' },
            { idx: 17, studentId: 3, date: '2026-01-20', riskScore: 62, source: 'Composite' },
            { idx: 18, studentId: 3, date: '2026-01-27', riskScore: 60, source: 'Composite' },
            { idx: 19, studentId: 3, date: '2026-02-10', riskScore: 75, source: 'Composite' },
            // Student 4 — Zanele Mkhize (moderate rising)
            { idx: 20, studentId: 4, date: '2026-01-13', riskScore: 30, source: 'Attendance' },
            { idx: 21, studentId: 4, date: '2026-01-27', riskScore: 40, source: 'Attendance' },
            { idx: 22, studentId: 4, date: '2026-02-10', riskScore: 52, source: 'Composite' },
            { idx: 23, studentId: 4, date: '2026-02-17', riskScore: 58, source: 'Attendance' },
            // Student 7 — Lungile Ndaba (chronic high)
            { idx: 24, studentId: 7, date: '2026-01-06', riskScore: 60, source: 'Academic' },
            { idx: 25, studentId: 7, date: '2026-01-13', riskScore: 65, source: 'Academic' },
            { idx: 26, studentId: 7, date: '2026-01-20', riskScore: 62, source: 'Academic' },
            { idx: 27, studentId: 7, date: '2026-01-27', riskScore: 70, source: 'Composite' },
            { idx: 28, studentId: 7, date: '2026-02-03', riskScore: 72, source: 'Academic' },
            { idx: 29, studentId: 7, date: '2026-02-10', riskScore: 75, source: 'Composite' },
            { idx: 30, studentId: 7, date: '2026-02-17', riskScore: 78, source: 'Academic' },
            // Student 5 — Ayanda Dlamini (steady moderate)
            { idx: 31, studentId: 5, date: '2026-01-06', riskScore: 40, source: 'Academic' },
            { idx: 32, studentId: 5, date: '2026-01-13', riskScore: 38, source: 'Academic' },
            { idx: 33, studentId: 5, date: '2026-01-27', riskScore: 42, source: 'Composite' },
            { idx: 34, studentId: 5, date: '2026-02-10', riskScore: 45, source: 'Academic' },
            { idx: 35, studentId: 5, date: '2026-02-17', riskScore: 44, source: 'Composite' },
            // Student 6 — Fatima Moosa (low stable)
            { idx: 36, studentId: 6, date: '2026-01-06', riskScore: 18, source: 'Composite' },
            { idx: 37, studentId: 6, date: '2026-01-13', riskScore: 20, source: 'Composite' },
            { idx: 38, studentId: 6, date: '2026-01-27', riskScore: 22, source: 'Composite' },
            { idx: 39, studentId: 6, date: '2026-02-10', riskScore: 19, source: 'Composite' },
            { idx: 40, studentId: 6, date: '2026-02-17', riskScore: 18, source: 'Composite' },
            // Student 8 — Nomsa Zulu (declining)
            { idx: 41, studentId: 8, date: '2026-01-06', riskScore: 50, source: 'Academic' },
            { idx: 42, studentId: 8, date: '2026-01-13', riskScore: 45, source: 'Academic' },
            { idx: 43, studentId: 8, date: '2026-01-27', riskScore: 38, source: 'Composite' },
            { idx: 44, studentId: 8, date: '2026-02-10', riskScore: 32, source: 'Academic' },
            { idx: 45, studentId: 8, date: '2026-02-17', riskScore: 28, source: 'Composite' },
            // Student 9 — Lerato Khumalo (recovering)
            { idx: 46, studentId: 9, date: '2026-01-06', riskScore: 70, source: 'Academic' },
            { idx: 47, studentId: 9, date: '2026-01-13', riskScore: 62, source: 'Academic' },
            { idx: 48, studentId: 9, date: '2026-01-27', riskScore: 48, source: 'Composite' },
            { idx: 49, studentId: 9, date: '2026-02-10', riskScore: 35, source: 'Academic' },
            { idx: 50, studentId: 9, date: '2026-02-17', riskScore: 28, source: 'Composite' },
            // Student 10 — Mandla Sithole (moderate rising)
            { idx: 51, studentId: 10, date: '2026-01-13', riskScore: 25, source: 'Financial' },
            { idx: 52, studentId: 10, date: '2026-01-27', riskScore: 35, source: 'Financial' },
            { idx: 53, studentId: 10, date: '2026-02-10', riskScore: 30, source: 'Composite' },
            { idx: 54, studentId: 10, date: '2026-02-17', riskScore: 22, source: 'Composite' }
        ]
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CaseworkSeed };
}
if (typeof window !== 'undefined') {
    window.CaseworkSeed = CaseworkSeed;
}
