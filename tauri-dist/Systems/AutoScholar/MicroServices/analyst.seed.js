/**
 * AnalystSeed — Demo seed data for Programme Analyst
 *
 * DUT-appropriate academic data: 4 programmes, 18 courses (NDIT),
 * 5 cohorts, 10 graduate attributes, GA-course mappings, prerequisites.
 *
 * Formalizes the hardcoded ProgAnalystData into proper seed format.
 */

const AnalystSeed = {
    data: {
        programme: [
            { idx: 1, code: 'NDIT', name: 'ND: Information Technology', nqf: 6, years: 3, department: 'Information Technology', faculty: 'Applied Sciences' },
            { idx: 2, code: 'NDEE', name: 'ND: Electrical Engineering', nqf: 6, years: 3, department: 'Electrical Engineering', faculty: 'Engineering' },
            { idx: 3, code: 'BSCS', name: 'BSc: Computer Science', nqf: 7, years: 3, department: 'Computer Science', faculty: 'Science' },
            { idx: 4, code: 'NDAC', name: 'ND: Accounting', nqf: 6, years: 3, department: 'Accounting', faculty: 'Commerce' }
        ],

        course: [
            // Year 1 Semester 1
            { idx: 1,  programmeId: 1, code: 'ITPR101', name: 'Programming 1A',          year: 1, semester: 'S1', credits: 20, type: 'core',     enrolled: 185, passed: 128, avgMark: 56.2, atRisk: 42, dfw: 30.8, dfwHistory: '32.1,31.5,30.8' },
            { idx: 2,  programmeId: 1, code: 'MATH101', name: 'Mathematics 1',            year: 1, semester: 'S1', credits: 15, type: 'core',     enrolled: 185, passed: 112, avgMark: 49.1, atRisk: 58, dfw: 39.5, dfwHistory: '41.2,40.0,39.5' },
            { idx: 3,  programmeId: 1, code: 'COMM101', name: 'Communication Skills',     year: 1, semester: 'S1', credits: 10, type: 'core',     enrolled: 185, passed: 168, avgMark: 64.8, atRisk: 12, dfw: 9.2,  dfwHistory: '10.5,9.8,9.2' },
            { idx: 4,  programmeId: 1, code: 'LIFE101', name: 'Life Skills',              year: 1, semester: 'S1', credits: 5,  type: 'elective', enrolled: 185, passed: 176, avgMark: 68.4, atRisk: 5,  dfw: 4.9,  dfwHistory: '5.8,5.2,4.9' },
            // Year 1 Semester 2
            { idx: 5,  programmeId: 1, code: 'ITPR102', name: 'Programming 1B',           year: 1, semester: 'S2', credits: 20, type: 'core',     enrolled: 158, passed: 118, avgMark: 58.7, atRisk: 32, dfw: 25.3, dfwHistory: '27.0,26.1,25.3' },
            { idx: 6,  programmeId: 1, code: 'ITWB101', name: 'Web Development 1',        year: 1, semester: 'S2', credits: 20, type: 'core',     enrolled: 158, passed: 136, avgMark: 62.4, atRisk: 18, dfw: 13.9, dfwHistory: '15.2,14.5,13.9' },
            { idx: 7,  programmeId: 1, code: 'ITDB101', name: 'Database Fundamentals',    year: 1, semester: 'S2', credits: 20, type: 'core',     enrolled: 158, passed: 122, avgMark: 55.9, atRisk: 28, dfw: 22.8, dfwHistory: '24.5,23.8,22.8' },
            // Year 2 Semester 1
            { idx: 8,  programmeId: 1, code: 'ITSD201', name: 'Software Development 2',   year: 2, semester: 'S1', credits: 20, type: 'core',     enrolled: 124, passed: 96,  avgMark: 60.3, atRisk: 22, dfw: 22.6, dfwHistory: '24.0,23.2,22.6' },
            { idx: 9,  programmeId: 1, code: 'ITDA201', name: 'Data Structures',          year: 2, semester: 'S1', credits: 20, type: 'core',     enrolled: 124, passed: 88,  avgMark: 54.6, atRisk: 30, dfw: 29.0, dfwHistory: '31.2,30.0,29.0' },
            { idx: 10, programmeId: 1, code: 'MATH201', name: 'Mathematics 2',            year: 2, semester: 'S1', credits: 15, type: 'core',     enrolled: 124, passed: 78,  avgMark: 48.2, atRisk: 42, dfw: 37.1, dfwHistory: '38.8,37.9,37.1' },
            { idx: 11, programmeId: 1, code: 'ITDB201', name: 'Database Design',          year: 2, semester: 'S1', credits: 20, type: 'core',     enrolled: 124, passed: 98,  avgMark: 58.1, atRisk: 20, dfw: 21.0, dfwHistory: '22.5,21.8,21.0' },
            // Year 2 Semester 2
            { idx: 12, programmeId: 1, code: 'ITSD202', name: 'Software Development 3',   year: 2, semester: 'S2', credits: 20, type: 'core',     enrolled: 108, passed: 86,  avgMark: 61.8, atRisk: 16, dfw: 20.4, dfwHistory: '22.0,21.1,20.4' },
            { idx: 13, programmeId: 1, code: 'ITNW201', name: 'Networking 2',             year: 2, semester: 'S2', credits: 20, type: 'elective', enrolled: 108, passed: 82,  avgMark: 55.4, atRisk: 22, dfw: 24.1, dfwHistory: '26.0,25.0,24.1' },
            { idx: 14, programmeId: 1, code: 'ITIA201', name: 'Information Analysis',     year: 2, semester: 'S2', credits: 15, type: 'elective', enrolled: 108, passed: 92,  avgMark: 63.2, atRisk: 10, dfw: 14.8, dfwHistory: '16.5,15.6,14.8' },
            // Year 3 Semester 1
            { idx: 15, programmeId: 1, code: 'ITPR301', name: 'Project Management',       year: 3, semester: 'S1', credits: 15, type: 'core',     enrolled: 86,  passed: 74,  avgMark: 64.1, atRisk: 8,  dfw: 14.0, dfwHistory: '15.5,14.8,14.0' },
            { idx: 16, programmeId: 1, code: 'ITSW301', name: 'Software Engineering',     year: 3, semester: 'S1', credits: 20, type: 'core',     enrolled: 86,  passed: 68,  avgMark: 58.9, atRisk: 14, dfw: 20.9, dfwHistory: '22.5,21.6,20.9' },
            { idx: 17, programmeId: 1, code: 'ITSP301', name: 'Industry Project',         year: 3, semester: 'S1', credits: 30, type: 'core',     enrolled: 86,  passed: 72,  avgMark: 62.5, atRisk: 10, dfw: 16.3, dfwHistory: '18.0,17.1,16.3' },
            // Year 3 Semester 2
            { idx: 18, programmeId: 1, code: 'ITWI301', name: 'Work-Integrated Learning', year: 3, semester: 'S2', credits: 60, type: 'core',     enrolled: 78,  passed: 72,  avgMark: 68.3, atRisk: 4,  dfw: 7.7,  dfwHistory: '9.0,8.3,7.7' }
        ],

        cohort: [
            { idx: 1, programmeId: 1, year: 2024, intake: 210, y1End: 162, y2End: 112, y3End: 84, graduated: 78, dropouts: 132, repeat: 18, excluded: 14, avgYearsToComplete: 3.8 },
            { idx: 2, programmeId: 1, year: 2023, intake: 195, y1End: 156, y2End: 108, y3End: 82, graduated: 76, dropouts: 119, repeat: 15, excluded: 10, avgYearsToComplete: 3.6 },
            { idx: 3, programmeId: 1, year: 2022, intake: 188, y1End: 148, y2End: 98,  y3End: 74, graduated: 68, dropouts: 120, repeat: 20, excluded: 12, avgYearsToComplete: 3.9 },
            { idx: 4, programmeId: 1, year: 2021, intake: 175, y1End: 138, y2End: 92,  y3End: 68, graduated: 62, dropouts: 113, repeat: 16, excluded: 11, avgYearsToComplete: 4.0 },
            { idx: 5, programmeId: 1, year: 2020, intake: 165, y1End: 132, y2End: 88,  y3End: 64, graduated: 58, dropouts: 107, repeat: 14, excluded: 9,  avgYearsToComplete: 3.7 }
        ],

        gaAttribute: [
            { idx: 1,  code: 'GA1',  name: 'Problem Solving',                       accBody: 'ECSA', totalCourses: 12, mappedCourses: 10 },
            { idx: 2,  code: 'GA2',  name: 'Application of Scientific Knowledge',   accBody: 'ECSA', totalCourses: 12, mappedCourses: 8 },
            { idx: 3,  code: 'GA3',  name: 'Engineering Design',                    accBody: 'ECSA', totalCourses: 12, mappedCourses: 7 },
            { idx: 4,  code: 'GA4',  name: 'Investigations & Experiments',          accBody: 'ECSA', totalCourses: 12, mappedCourses: 6 },
            { idx: 5,  code: 'GA5',  name: 'Engineering Methods & Tools',           accBody: 'ECSA', totalCourses: 12, mappedCourses: 11 },
            { idx: 6,  code: 'GA6',  name: 'Professional & Technical Communication', accBody: 'ECSA', totalCourses: 12, mappedCourses: 9 },
            { idx: 7,  code: 'GA7',  name: 'Sustainability & Impact',               accBody: 'ECSA', totalCourses: 12, mappedCourses: 5 },
            { idx: 8,  code: 'GA8',  name: 'Individual & Teamwork',                 accBody: 'ECSA', totalCourses: 12, mappedCourses: 10 },
            { idx: 9,  code: 'GA9',  name: 'Independent Learning',                  accBody: 'ECSA', totalCourses: 12, mappedCourses: 8 },
            { idx: 10, code: 'GA10', name: 'Engineering Professionalism',            accBody: 'ECSA', totalCourses: 12, mappedCourses: 7 }
        ],

        gaCourseMapping: [
            // GA1 — Problem Solving
            { idx: 1,  gaAttributeId: 1, courseId: 1,  gaCode: 'GA1', courseCode: 'ITPR101', level: 'I' },
            { idx: 2,  gaAttributeId: 1, courseId: 2,  gaCode: 'GA1', courseCode: 'MATH101', level: 'I' },
            { idx: 3,  gaAttributeId: 1, courseId: 5,  gaCode: 'GA1', courseCode: 'ITPR102', level: 'R' },
            { idx: 4,  gaAttributeId: 1, courseId: 9,  gaCode: 'GA1', courseCode: 'ITDA201', level: 'R' },
            { idx: 5,  gaAttributeId: 1, courseId: 8,  gaCode: 'GA1', courseCode: 'ITSD201', level: 'R' },
            { idx: 6,  gaAttributeId: 1, courseId: 10, gaCode: 'GA1', courseCode: 'MATH201', level: 'R' },
            { idx: 7,  gaAttributeId: 1, courseId: 12, gaCode: 'GA1', courseCode: 'ITSD202', level: 'A' },
            { idx: 8,  gaAttributeId: 1, courseId: 16, gaCode: 'GA1', courseCode: 'ITSW301', level: 'A' },
            { idx: 9,  gaAttributeId: 1, courseId: 17, gaCode: 'GA1', courseCode: 'ITSP301', level: 'A' },
            { idx: 10, gaAttributeId: 1, courseId: 18, gaCode: 'GA1', courseCode: 'ITWI301', level: 'A' },
            // GA2 — Application of Scientific Knowledge
            { idx: 11, gaAttributeId: 2, courseId: 2,  gaCode: 'GA2', courseCode: 'MATH101', level: 'I' },
            { idx: 12, gaAttributeId: 2, courseId: 1,  gaCode: 'GA2', courseCode: 'ITPR101', level: 'I' },
            { idx: 13, gaAttributeId: 2, courseId: 10, gaCode: 'GA2', courseCode: 'MATH201', level: 'R' },
            { idx: 14, gaAttributeId: 2, courseId: 9,  gaCode: 'GA2', courseCode: 'ITDA201', level: 'R' },
            { idx: 15, gaAttributeId: 2, courseId: 8,  gaCode: 'GA2', courseCode: 'ITSD201', level: 'R' },
            { idx: 16, gaAttributeId: 2, courseId: 16, gaCode: 'GA2', courseCode: 'ITSW301', level: 'A' },
            { idx: 17, gaAttributeId: 2, courseId: 17, gaCode: 'GA2', courseCode: 'ITSP301', level: 'A' },
            { idx: 18, gaAttributeId: 2, courseId: 18, gaCode: 'GA2', courseCode: 'ITWI301', level: 'A' },
            // GA3 — Engineering Design
            { idx: 19, gaAttributeId: 3, courseId: 5,  gaCode: 'GA3', courseCode: 'ITPR102', level: 'I' },
            { idx: 20, gaAttributeId: 3, courseId: 6,  gaCode: 'GA3', courseCode: 'ITWB101', level: 'I' },
            { idx: 21, gaAttributeId: 3, courseId: 8,  gaCode: 'GA3', courseCode: 'ITSD201', level: 'R' },
            { idx: 22, gaAttributeId: 3, courseId: 11, gaCode: 'GA3', courseCode: 'ITDB201', level: 'R' },
            { idx: 23, gaAttributeId: 3, courseId: 12, gaCode: 'GA3', courseCode: 'ITSD202', level: 'A' },
            { idx: 24, gaAttributeId: 3, courseId: 16, gaCode: 'GA3', courseCode: 'ITSW301', level: 'A' },
            { idx: 25, gaAttributeId: 3, courseId: 17, gaCode: 'GA3', courseCode: 'ITSP301', level: 'A' },
            // GA4 — Investigations & Experiments
            { idx: 26, gaAttributeId: 4, courseId: 7,  gaCode: 'GA4', courseCode: 'ITDB101', level: 'I' },
            { idx: 27, gaAttributeId: 4, courseId: 9,  gaCode: 'GA4', courseCode: 'ITDA201', level: 'I' },
            { idx: 28, gaAttributeId: 4, courseId: 11, gaCode: 'GA4', courseCode: 'ITDB201', level: 'R' },
            { idx: 29, gaAttributeId: 4, courseId: 14, gaCode: 'GA4', courseCode: 'ITIA201', level: 'R' },
            { idx: 30, gaAttributeId: 4, courseId: 17, gaCode: 'GA4', courseCode: 'ITSP301', level: 'A' },
            { idx: 31, gaAttributeId: 4, courseId: 18, gaCode: 'GA4', courseCode: 'ITWI301', level: 'A' },
            // GA5 — Engineering Methods & Tools
            { idx: 32, gaAttributeId: 5, courseId: 1,  gaCode: 'GA5', courseCode: 'ITPR101', level: 'I' },
            { idx: 33, gaAttributeId: 5, courseId: 6,  gaCode: 'GA5', courseCode: 'ITWB101', level: 'I' },
            { idx: 34, gaAttributeId: 5, courseId: 7,  gaCode: 'GA5', courseCode: 'ITDB101', level: 'I' },
            { idx: 35, gaAttributeId: 5, courseId: 5,  gaCode: 'GA5', courseCode: 'ITPR102', level: 'R' },
            { idx: 36, gaAttributeId: 5, courseId: 8,  gaCode: 'GA5', courseCode: 'ITSD201', level: 'R' },
            { idx: 37, gaAttributeId: 5, courseId: 11, gaCode: 'GA5', courseCode: 'ITDB201', level: 'R' },
            { idx: 38, gaAttributeId: 5, courseId: 9,  gaCode: 'GA5', courseCode: 'ITDA201', level: 'R' },
            { idx: 39, gaAttributeId: 5, courseId: 12, gaCode: 'GA5', courseCode: 'ITSD202', level: 'A' },
            { idx: 40, gaAttributeId: 5, courseId: 13, gaCode: 'GA5', courseCode: 'ITNW201', level: 'A' },
            { idx: 41, gaAttributeId: 5, courseId: 16, gaCode: 'GA5', courseCode: 'ITSW301', level: 'A' },
            { idx: 42, gaAttributeId: 5, courseId: 17, gaCode: 'GA5', courseCode: 'ITSP301', level: 'A' },
            // GA6 — Professional & Technical Communication
            { idx: 43, gaAttributeId: 6, courseId: 3,  gaCode: 'GA6', courseCode: 'COMM101', level: 'I' },
            { idx: 44, gaAttributeId: 6, courseId: 4,  gaCode: 'GA6', courseCode: 'LIFE101', level: 'I' },
            { idx: 45, gaAttributeId: 6, courseId: 14, gaCode: 'GA6', courseCode: 'ITIA201', level: 'R' },
            { idx: 46, gaAttributeId: 6, courseId: 15, gaCode: 'GA6', courseCode: 'ITPR301', level: 'R' },
            { idx: 47, gaAttributeId: 6, courseId: 16, gaCode: 'GA6', courseCode: 'ITSW301', level: 'R' },
            { idx: 48, gaAttributeId: 6, courseId: 12, gaCode: 'GA6', courseCode: 'ITSD202', level: 'R' },
            { idx: 49, gaAttributeId: 6, courseId: 6,  gaCode: 'GA6', courseCode: 'ITWB101', level: 'R' },
            { idx: 50, gaAttributeId: 6, courseId: 17, gaCode: 'GA6', courseCode: 'ITSP301', level: 'A' },
            { idx: 51, gaAttributeId: 6, courseId: 18, gaCode: 'GA6', courseCode: 'ITWI301', level: 'A' },
            // GA7 — Sustainability & Impact
            { idx: 52, gaAttributeId: 7, courseId: 4,  gaCode: 'GA7', courseCode: 'LIFE101', level: 'I' },
            { idx: 53, gaAttributeId: 7, courseId: 3,  gaCode: 'GA7', courseCode: 'COMM101', level: 'I' },
            { idx: 54, gaAttributeId: 7, courseId: 15, gaCode: 'GA7', courseCode: 'ITPR301', level: 'R' },
            { idx: 55, gaAttributeId: 7, courseId: 16, gaCode: 'GA7', courseCode: 'ITSW301', level: 'A' },
            { idx: 56, gaAttributeId: 7, courseId: 18, gaCode: 'GA7', courseCode: 'ITWI301', level: 'A' },
            // GA8 — Individual & Teamwork
            { idx: 57, gaAttributeId: 8, courseId: 4,  gaCode: 'GA8', courseCode: 'LIFE101', level: 'I' },
            { idx: 58, gaAttributeId: 8, courseId: 3,  gaCode: 'GA8', courseCode: 'COMM101', level: 'I' },
            { idx: 59, gaAttributeId: 8, courseId: 6,  gaCode: 'GA8', courseCode: 'ITWB101', level: 'R' },
            { idx: 60, gaAttributeId: 8, courseId: 8,  gaCode: 'GA8', courseCode: 'ITSD201', level: 'R' },
            { idx: 61, gaAttributeId: 8, courseId: 12, gaCode: 'GA8', courseCode: 'ITSD202', level: 'R' },
            { idx: 62, gaAttributeId: 8, courseId: 15, gaCode: 'GA8', courseCode: 'ITPR301', level: 'R' },
            { idx: 63, gaAttributeId: 8, courseId: 9,  gaCode: 'GA8', courseCode: 'ITDA201', level: 'R' },
            { idx: 64, gaAttributeId: 8, courseId: 17, gaCode: 'GA8', courseCode: 'ITSP301', level: 'A' },
            { idx: 65, gaAttributeId: 8, courseId: 18, gaCode: 'GA8', courseCode: 'ITWI301', level: 'A' },
            { idx: 66, gaAttributeId: 8, courseId: 16, gaCode: 'GA8', courseCode: 'ITSW301', level: 'A' },
            // GA9 — Independent Learning
            { idx: 67, gaAttributeId: 9, courseId: 4,  gaCode: 'GA9', courseCode: 'LIFE101', level: 'I' },
            { idx: 68, gaAttributeId: 9, courseId: 1,  gaCode: 'GA9', courseCode: 'ITPR101', level: 'I' },
            { idx: 69, gaAttributeId: 9, courseId: 5,  gaCode: 'GA9', courseCode: 'ITPR102', level: 'R' },
            { idx: 70, gaAttributeId: 9, courseId: 8,  gaCode: 'GA9', courseCode: 'ITSD201', level: 'R' },
            { idx: 71, gaAttributeId: 9, courseId: 12, gaCode: 'GA9', courseCode: 'ITSD202', level: 'R' },
            { idx: 72, gaAttributeId: 9, courseId: 17, gaCode: 'GA9', courseCode: 'ITSP301', level: 'A' },
            { idx: 73, gaAttributeId: 9, courseId: 18, gaCode: 'GA9', courseCode: 'ITWI301', level: 'A' },
            { idx: 74, gaAttributeId: 9, courseId: 16, gaCode: 'GA9', courseCode: 'ITSW301', level: 'A' },
            // GA10 — Engineering Professionalism
            { idx: 75, gaAttributeId: 10, courseId: 4,  gaCode: 'GA10', courseCode: 'LIFE101', level: 'I' },
            { idx: 76, gaAttributeId: 10, courseId: 3,  gaCode: 'GA10', courseCode: 'COMM101', level: 'I' },
            { idx: 77, gaAttributeId: 10, courseId: 15, gaCode: 'GA10', courseCode: 'ITPR301', level: 'R' },
            { idx: 78, gaAttributeId: 10, courseId: 16, gaCode: 'GA10', courseCode: 'ITSW301', level: 'R' },
            { idx: 79, gaAttributeId: 10, courseId: 14, gaCode: 'GA10', courseCode: 'ITIA201', level: 'R' },
            { idx: 80, gaAttributeId: 10, courseId: 17, gaCode: 'GA10', courseCode: 'ITSP301', level: 'A' },
            { idx: 81, gaAttributeId: 10, courseId: 18, gaCode: 'GA10', courseCode: 'ITWI301', level: 'A' }
        ],

        prerequisite: [
            { idx: 1,  courseId: 5,  prereqCourseId: 1,  courseCode: 'ITPR102', prereqCode: 'ITPR101' },
            { idx: 2,  courseId: 6,  prereqCourseId: 1,  courseCode: 'ITWB101', prereqCode: 'ITPR101' },
            { idx: 3,  courseId: 7,  prereqCourseId: 3,  courseCode: 'ITDB101', prereqCode: 'COMM101' },
            { idx: 4,  courseId: 8,  prereqCourseId: 5,  courseCode: 'ITSD201', prereqCode: 'ITPR102' },
            { idx: 5,  courseId: 8,  prereqCourseId: 7,  courseCode: 'ITSD201', prereqCode: 'ITDB101' },
            { idx: 6,  courseId: 9,  prereqCourseId: 5,  courseCode: 'ITDA201', prereqCode: 'ITPR102' },
            { idx: 7,  courseId: 9,  prereqCourseId: 2,  courseCode: 'ITDA201', prereqCode: 'MATH101' },
            { idx: 8,  courseId: 10, prereqCourseId: 2,  courseCode: 'MATH201', prereqCode: 'MATH101' },
            { idx: 9,  courseId: 11, prereqCourseId: 7,  courseCode: 'ITDB201', prereqCode: 'ITDB101' },
            { idx: 10, courseId: 12, prereqCourseId: 8,  courseCode: 'ITSD202', prereqCode: 'ITSD201' },
            { idx: 11, courseId: 12, prereqCourseId: 9,  courseCode: 'ITSD202', prereqCode: 'ITDA201' },
            { idx: 12, courseId: 13, prereqCourseId: 8,  courseCode: 'ITNW201', prereqCode: 'ITSD201' },
            { idx: 13, courseId: 14, prereqCourseId: 11, courseCode: 'ITIA201', prereqCode: 'ITDB201' },
            { idx: 14, courseId: 15, prereqCourseId: 12, courseCode: 'ITPR301', prereqCode: 'ITSD202' },
            { idx: 15, courseId: 16, prereqCourseId: 12, courseCode: 'ITSW301', prereqCode: 'ITSD202' },
            { idx: 16, courseId: 16, prereqCourseId: 9,  courseCode: 'ITSW301', prereqCode: 'ITDA201' },
            { idx: 17, courseId: 17, prereqCourseId: 16, courseCode: 'ITSP301', prereqCode: 'ITSW301' },
            { idx: 18, courseId: 17, prereqCourseId: 15, courseCode: 'ITSP301', prereqCode: 'ITPR301' },
            { idx: 19, courseId: 18, prereqCourseId: 17, courseCode: 'ITWI301', prereqCode: 'ITSP301' }
        ]
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) { module.exports = AnalystSeed; }
if (typeof window !== 'undefined') { window.AnalystSeed = AnalystSeed; }
