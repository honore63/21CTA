const { pool } = require('../config/database');

/**
 * Digital Library Controller
 * Manages curriculum textbooks, digital resources, resource upload, and borrowing loans
 */

// Get Library Resources
exports.getResources = async (req, res, next) => {
    try {
        const schoolId = req.user?.school_id || req.query.school_id || 1;
        const { category, type, search } = req.query;

        let query = `
            SELECT lr.*, u.full_name AS uploaded_by_name
            FROM library_resources lr
            LEFT JOIN users u ON lr.uploaded_by = u.id
            WHERE (lr.school_id = ? OR lr.school_id IS NULL) AND lr.status = 'active'
        `;
        const params = [schoolId];

        if (category) {
            query += ' AND lr.category = ?';
            params.push(category);
        }
        if (type) {
            query += ' AND lr.resource_type = ?';
            params.push(type);
        }
        if (search) {
            query += ' AND (lr.title LIKE ? OR lr.author LIKE ? OR lr.description LIKE ?)';
            const term = `%${search}%`;
            params.push(term, term, term);
        }

        query += ' ORDER BY lr.created_at DESC';

        const [resources] = await pool.query(query, params);

        res.json({
            success: true,
            data: resources
        });
    } catch (error) {
        next(error);
    }
};

// Add Library Resource
exports.addResource = async (req, res, next) => {
    try {
        const schoolId = req.user?.school_id || 1;
        const uploaderId = req.user?.id || 116;
        const { title, author, category, resource_type, isbn, description, total_copies, file_url, cover_url } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, message: 'Resource title is required' });
        }

        const copies = parseInt(total_copies) || 1;

        const [result] = await pool.query(`
            INSERT INTO library_resources (school_id, title, author, category, resource_type, isbn, description, total_copies, available_copies, status, file_url, cover_url, uploaded_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
        `, [schoolId, title, author || null, category || 'General', resource_type || 'book', isbn || null, description || null, copies, copies, file_url || null, cover_url || null, uploaderId]);

        res.status(201).json({
            success: true,
            message: 'Library resource added successfully',
            data: { id: result.insertId }
        });
    } catch (error) {
        next(error);
    }
};

// Get Active Loans
exports.getLoans = async (req, res, next) => {
    try {
        const schoolId = req.user?.school_id || 1;
        const { status } = req.query;

        let query = `
            SELECT ll.*, lr.title AS book_title, lr.author, lr.isbn,
                   u.full_name AS borrower_name, u.email AS borrower_email,
                   st.first_name, st.last_name, st.admission_number, c.name AS class_name
            FROM library_loans ll
            JOIN library_resources lr ON ll.resource_id = lr.id
            JOIN users u ON ll.borrower_user_id = u.id
            LEFT JOIN student_profiles st ON ll.student_id = st.id
            LEFT JOIN classes c ON st.class_id = c.id
            WHERE ll.school_id = ?
        `;
        const params = [schoolId];

        if (status) {
            query += ' AND ll.status = ?';
            params.push(status);
        }

        query += ' ORDER BY ll.due_at ASC';

        const [loans] = await pool.query(query, params);

        res.json({
            success: true,
            data: loans
        });
    } catch (error) {
        next(error);
    }
};

// Issue Resource Loan
exports.borrowResource = async (req, res, next) => {
    try {
        const schoolId = req.user?.school_id || 1;
        const issuerId = req.user?.id || 116;
        const { resource_id, borrower_user_id, student_id, days = 14, notes } = req.body;

        // Check availability
        const [[resource]] = await pool.query('SELECT available_copies FROM library_resources WHERE id = ?', [resource_id]);
        if (!resource || resource.available_copies <= 0) {
            return res.status(400).json({ success: false, message: 'Resource has no available copies for borrowing' });
        }

        // Decrement available copies
        await pool.query('UPDATE library_resources SET available_copies = available_copies - 1 WHERE id = ?', [resource_id]);

        // Insert loan
        const [result] = await pool.query(`
            INSERT INTO library_loans (school_id, resource_id, borrower_user_id, student_id, borrowed_at, due_at, status, issued_by, notes)
            VALUES (?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? DAY), 'borrowed', ?, ?)
        `, [schoolId, resource_id, borrower_user_id, student_id || null, days, issuerId, notes || null]);

        res.json({
            success: true,
            message: 'Book loaned successfully',
            data: { loan_id: result.insertId }
        });
    } catch (error) {
        next(error);
    }
};

// Return Resource Loan
exports.returnResource = async (req, res, next) => {
    try {
        const loanId = req.params.loanId;

        const [[loan]] = await pool.query('SELECT resource_id, status FROM library_loans WHERE id = ?', [loanId]);
        if (!loan) {
            return res.status(404).json({ success: false, message: 'Loan record not found' });
        }

        if (loan.status === 'returned') {
            return res.status(400).json({ success: false, message: 'Resource has already been returned' });
        }

        await pool.query('UPDATE library_loans SET status = "returned", returned_at = NOW() WHERE id = ?', [loanId]);
        await pool.query('UPDATE library_resources SET available_copies = available_copies + 1 WHERE id = ?', [loan.resource_id]);

        res.json({
            success: true,
            message: 'Book returned successfully'
        });
    } catch (error) {
        next(error);
    }
};
