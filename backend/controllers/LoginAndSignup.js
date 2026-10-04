import bcrypt from 'bcrypt';
import User from '../model/UserModel.js';

export const SignUp = async (req, res) => {
    try {
        const { username, email, password, locCode, address, phone, gst, power, role, allowedLocCodes } = req.body;
        console.log(username, email, password, locCode, address, phone, gst, power);

        if (!password) {
            return res.status(400).json({ message: "Password is required." });
        }

        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(400).json({ message: 'Username or email already exists.' });
        }
        const passWord = 'test';

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            username,
            email,
            power,
            password: hashedPassword,
            locCode: locCode || '',
            address: address || '',
            phone: phone || '',
            gst: gst || '',
            role: role || null,
            allowedLocCodes: role === 'cluster_manager' ? (allowedLocCodes || []) : [],
        });

        await newUser.save();

        res.status(201).json({
            message: 'User created successfully, and mandatory training assigned.',
            user: newUser,
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            message: 'An error occurred while creating the user.',
            error: error.message,
        });
    }
};







export const Login = async (req, res) => {
    try {
        const { email, EmpId: password } = req.body;

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password.' });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password.' });
        }

        // Generate JWT token


        res.status(200).json({
            message: 'Login successful',

            user: {
                email: user.email,
                username: user.username,
                power: user.power,
                locCode: user.locCode,
                role: user.role || null,
                storeName: user.storeName || user.username,
                storeId: user.storeId,
                allowedLocCodes: user.allowedLocCodes || [],
            },
        });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({
            message: 'An error occurred during login.',
            error: error.message,
        });
    }
};

export const GetAllStores = async (req, res) => {
    try {
        const users = await User.find({}, { password: 0 }); // Exclude password from response
        const stores = users.map(user => ({
            locName: user.username,
            locCode: user.locCode,
        }));
        
        res.status(200).json({
            message: 'Stores retrieved successfully',
            stores: stores,
        });
    } catch (error) {
        console.error('GetAllStores Error:', error);
        res.status(500).json({
            message: 'An error occurred while fetching stores.',
            error: error.message,
        });
    }
};

export const GetAllUsers = async (req, res) => {
    try {
        const users = await User.find({}, { password: 0 }).sort({ createdAt: -1 }); // Exclude password, sort by newest first
        
        res.status(200).json({
            message: 'Users retrieved successfully',
            users: users,
        });
    } catch (error) {
        console.error('GetAllUsers Error:', error);
        res.status(500).json({
            message: 'An error occurred while fetching users.',
            error: error.message,
        });
    }
};

export const UpdateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, locCode, address, phone, gst, power, password, role, allowedLocCodes } = req.body;

        // Validate input
        if (!username || !email) {
            return res.status(400).json({ message: 'Username and email are required.' });
        }

        // Find user
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Check if email is being changed and if it's already taken by another user
        if (email !== user.email) {
            const existingUser = await User.findOne({ email, _id: { $ne: id } });
            if (existingUser) {
                return res.status(400).json({ message: 'Email already exists.' });
            }
        }

        // Update fields
        user.username = username;
        user.email = email;
        user.locCode = locCode || '';
        user.address = address || '';
        user.phone = phone || '';
        user.gst = gst || '';
        user.power = power;
        user.role = role || null;
        user.allowedLocCodes = role === 'cluster_manager' ? (allowedLocCodes || []) : [];

        // Only update password if provided
        if (password && password.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }

        await user.save();

        res.status(200).json({
            message: 'User updated successfully.',
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                locCode: user.locCode,
                address: user.address,
                phone: user.phone,
                gst: user.gst,
                power: user.power,
            },
        });
    } catch (error) {
        console.error('UpdateUser Error:', error);
        res.status(500).json({
            message: 'An error occurred while updating the user.',
            error: error.message,
        });
    }
};


export const DeleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        await User.findByIdAndDelete(id);
        res.status(200).json({ message: 'User deleted successfully.' });
    } catch (error) {
        console.error('DeleteUser Error:', error);
        res.status(500).json({ message: 'An error occurred while deleting the user.', error: error.message });
    }
};

export const ResetPassword = async (req, res) => {
    try {
        const { email, newPassword } = req.body;

        // Validate input
        if (!email || !newPassword) {
            return res.status(400).json({ message: 'Email and new password are required.' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
        }

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password
        user.password = hashedPassword;
        await user.save();

        res.status(200).json({
            message: 'Password reset successfully.',
            user: {
                email: user.email,
                username: user.username,
            },
        });
    } catch (error) {
        console.error('ResetPassword Error:', error);
        res.status(500).json({
            message: 'An error occurred while resetting the password.',
            error: error.message,
        });
    }
};
