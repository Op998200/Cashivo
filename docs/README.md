# Cashivo MVP - Simple Personal Finance Tracker

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.0--mvp-green.svg)](https://github.com/yourusername/cashivo-v2)
[![Status](https://img.shields.io/badge/status-MVP%20Ready-brightgreen.svg)](https://github.com/yourusername/cashivo-v2)

## Overview

Cashivo MVP is a lightweight, fast, and intuitive personal finance tracker built with modern web technologies. This Minimum Viable Product focuses on core functionality that provides immediate value to users while maintaining a solid foundation for future feature expansion.

## 🚀 MVP Features (Phase 1)

### ✅ Essential Transaction Management
- **Add Transactions**: Record income and expenses with amount, category, date, description
- **Receipt Photos**: Upload and attach receipt images to transactions
- **Transaction History**: View, search, and filter all your transactions
- **Delete Transactions**: Remove transactions with confirmation dialog

### 📊 Financial Overview
- **Balance Tracking**: Real-time calculation of income minus expenses
- **Monthly Summary**: Current month income, expenses, and net total
- **Visual Breakdown**: Simple doughnut chart showing expense categories
- **Transaction Counter**: Track total number of recorded transactions

### 🔍 Smart Search & Filtering
- **Real-time Search**: Instant search across transaction descriptions and categories
- **Type Filtering**: Show all, income only, or expenses only
- **Pagination**: Load more transactions as needed for performance

### 🔐 Secure Authentication
- **Email Registration**: Create account with email verification
- **Secure Login**: Password authentication with forgot password option
- **Session Management**: Secure user sessions via Supabase
- **Profile Management**: Basic profile and account settings

### 📱 Mobile-First Design
- **Responsive Layout**: Works perfectly on all device sizes
- **Touch-Friendly**: Large buttons and intuitive interactions
- **Fast Loading**: Optimized for quick mobile performance

## 🔮 Coming in Phase 2 (Advanced Features)

### 💰 Budget Management System
- Set monthly/weekly budgets by category
- Real-time progress tracking with visual indicators
- Budget alerts when approaching limits
- Spending variance analysis

### 🎯 Financial Goals Tracking
- Set savings goals with target dates
- Track progress with visual indicators
- Goal achievement notifications
- Priority management system

### 🔄 Recurring Transactions
- Automate recurring income/expenses
- Flexible scheduling (weekly, monthly, yearly)
- Subscription and bill tracking
- Smart processing and management

### 📊 Advanced Analytics
- Multiple chart types and views
- Spending trends over time
- Category analysis and insights
- Custom date range reporting

### 🔔 Notifications & Alerts
- Budget overspend alerts
- Goal milestone notifications
- Smart spending insights
- Customizable notification preferences

### 🔐 Security & Authentication
- **Supabase Auth**: Secure user authentication and session management
- **Row Level Security (RLS)**: Database-level security policies
- **File Security**: Secure file storage with user-based access control
- **Data Encryption**: All data encrypted in transit and at rest

### 📱 User Experience
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Modern UI**: Clean, intuitive interface with smooth animations
- **Real-time Updates**: Live data synchronization
- **Error Handling**: Comprehensive error handling and user feedback
- **Loading States**: Smooth loading indicators and transitions

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript ES6+ Modules
- **Backend**: Supabase (PostgreSQL + Authentication + Storage)
- **Charts**: Chart.js for data visualization
- **Icons**: Unicode emojis for cross-platform compatibility
- **Architecture**: Modular ES6 class-based components

## 📋 MVP Project Structure

```
cashivo-v2/
├── index.html                   # Landing page
├── login.html                   # User sign in
├── register.html                # User sign up
├── dashboard-mvp.html           # 🎆 MVP Dashboard (main app)
├── profile.html                 # User profile management
├── css/
│   └── modern-styles.css         # 🎨 Single comprehensive stylesheet
├── js/
│   ├── auth.js                  # 🔐 Authentication core
│   ├── utils.js                 # ⚙️ Core business logic
│   ├── storage.js               # 📁 File upload handling
│   ├── supabaseClient.js        # 🛯 Database connection
│   ├── mvp-dashboard.js         # 🏠 MVP dashboard controller
│   ├── mvp-login.js             # 🔑 Login page handler
│   ├── mvp-register.js          # 📝 Registration handler
│   └── profile.js               # 👤 Profile management
├── database.sql                 # 🗺️ Database schema
├── MVP-DEPLOYMENT.md            # 🚀 MVP deployment guide
├── PHASE-2-ROADMAP.md           # 🗺️ Phase 2 feature roadmap
├── SETUP-GUIDE.md               # ⚙️ Setup instructions
└── README.md                    # 📜 This file

📁 Phase 2 Features (Ready to implement):
└── js/
    ├── budget-manager.js         # 💰 Budget management (prepared)
    ├── goals-manager.js          # 🎯 Goals tracking (prepared)
    ├── recurring-transactions.js # 🔄 Recurring transactions (prepared)
    ├── notifications.js          # 🔔 Alert system (prepared)
    └── charts.js                 # 📊 Advanced charts (prepared)
```

## 🚀 Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Supabase account
- Basic knowledge of HTML/CSS/JavaScript

### Setup Instructions

1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/cashivo-v2.git
   cd cashivo-v2
   ```

2. **Configure Supabase**
   - Create a new Supabase project
   - Copy your project URL and anon key
   - Update `js/supabaseClient.js` with your credentials

3. **Setup Database**
   - Execute `supabase-setup.sql` in your Supabase SQL Editor
   - Execute `database-schema-updates.sql` for advanced features
   - Verify all tables are created correctly

4. **Configure Storage**
   - Create storage buckets in Supabase:
     - `user-receipts` (private, 5MB limit)
     - `user-avatars` (public, 2MB limit)
   - Set up storage policies as described in setup guide

5. **Launch MVP Application**
   - Open `index.html` in your browser or serve via local web server
   - Register a new account or login with existing credentials
   - Navigate to `dashboard-mvp.html` to start tracking your finances!

## 💡 MVP Usage Guide

### Quick Start (3 Steps)
1. **Sign Up**: Create your account in under 30 seconds
2. **Add Transactions**: Record your first income or expense
3. **View Overview**: See your balance and spending breakdown

### Adding Your First Transaction
1. Choose Income or Expense from the dropdown
2. Enter the amount and select a category
3. Add a description (e.g., "Grocery shopping at Walmart")
4. Optionally upload a receipt photo
5. Click "Add Transaction" and see it appear in your list!

### Managing Your Money
- **Search**: Use the search box to find specific transactions
- **Filter**: Show only income or only expenses
- **Receipts**: Click receipt thumbnails to view full size
- **Delete**: Remove incorrect transactions with the delete button
- **Balance**: Watch your balance update in real-time

### Understanding Your Overview
- **Total Income**: All money you've recorded coming in
- **Total Expenses**: All money you've spent
- **Balance**: Your current financial position (income - expenses)
- **Monthly Stats**: How you're doing this month specifically
- **Chart**: Visual breakdown of where your money goes

## 🔧 Customization

### Adding New Categories
Categories are stored in the database and can be extended by:
1. Adding entries to the `categories` table
2. Including name, type (income/expense), and hex color
3. Categories automatically appear in dropdowns

### Notification Preferences
Customize notifications through the Profile page:
- Enable/disable budget alerts
- Control goal notifications
- Set up email summaries (when implemented)
- Configure sound notifications

### Themes and Styling
The modular CSS structure allows easy customization:
- `styles.css`: Base styling
- `modern-styles.css`: Component styles
- `dashboard-enhanced.css`: Advanced UI components
- `responsive.css`: Mobile optimizations

## 🔒 Security Features

- **Authentication**: Secure user authentication with Supabase Auth
- **Row Level Security**: Database-level access control
- **File Security**: User-isolated file storage
- **Input Validation**: Client and server-side validation
- **HTTPS**: Secure communication (when properly deployed)

## 📊 Database Schema

### Core Tables
- `transactions`: User financial transactions
- `categories`: Transaction categories (income/expense)
- `budgets`: User budget definitions
- `financial_goals`: Savings and financial targets
- `recurring_transactions`: Automated transaction templates
- `user_preferences`: User settings and preferences

### Key Features
- Foreign key relationships for data integrity
- Automatic timestamp updates
- Indexed columns for performance
- RLS policies for security

## 🚀 Performance Optimizations

- **Lazy Loading**: Components load only when needed
- **Database Indexing**: Optimized queries with proper indexes
- **Real-time Updates**: Efficient Supabase subscriptions
- **Image Optimization**: Automatic image compression for uploads
- **Caching**: Browser caching for static assets
- **Minification**: Optimized for production deployment

## 🧪 Testing

The application includes comprehensive error handling and validation:
- Form validation with user feedback
- Network error handling
- File upload validation
- Database constraint enforcement
- Real-time error reporting

## 🚀 Why Start with MVP?

### Immediate Value
- **Fast to deploy**: Get up and running in minutes
- **Core needs met**: Covers 80% of personal finance tracking needs
- **Proven concept**: Test with real users before building advanced features
- **Iterative improvement**: Build based on actual user feedback

### Technical Benefits
- **Lightweight**: Fast loading and minimal resource usage
- **Maintainable**: Clean, simple codebase
- **Scalable foundation**: Ready for Phase 2 feature additions
- **Production ready**: Includes error handling and security

### User Benefits
- **No learning curve**: Intuitive interface anyone can use
- **Mobile friendly**: Works great on phones and tablets
- **Instant feedback**: Real-time updates and visual confirmation
- **Privacy focused**: Your data stays secure and private

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Supabase** for the excellent backend-as-a-service platform
- **Chart.js** for beautiful and responsive data visualizations
- **Modern CSS** techniques for responsive design
- **ES6 Modules** for clean, maintainable code architecture

## 📞 Support

For support, questions, or feature requests:
- Create an issue in the GitHub repository
- Email: your-email@example.com
- Documentation: [Project Wiki](link-to-wiki)

---

## 🎯 Next Steps

1. **Try the MVP**: Open `dashboard-mvp.html` after setup
2. **Give Feedback**: What features matter most to you?
3. **Phase 2 Preview**: Check `PHASE-2-ROADMAP.md` for upcoming features
4. **Contribute**: Help make Cashivo even better!

**Cashivo MVP** - Simple, fast, effective personal finance tracking! 💰📱✨
