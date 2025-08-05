# Cashivo - Income and Expenses Tracker

## Project Overview
Cashivo is a modern, responsive income and expenses tracker with user authentication and data visualization features.

## Technology Stack
- HTML5
- CSS3 (with Flexbox/Grid)
- JavaScript (ES6+)
- Local Storage for data persistence
- Chart.js for data visualization

## Project Structure
```
cashivo/
├── index.html (Homepage)
├── login.html
├── register.html
├── dashboard.html
├── profile.html
├── css/
│   ├── styles.css
│   └── responsive.css
├── js/
│   ├── auth.js
│   ├── dashboard.js
│   ├── transactions.js
│   ├── charts.js
│   └── utils.js
├── assets/
│   └── images/
└── README.md
```

## Features

### Homepage (index.html)
- App introduction and features overview
- Navigation to login/register
- Responsive design

### Authentication System
- User registration with validation
- User login with authentication
- Password storage (hashed in a real app)
- Session management

### Dashboard
- Summary cards (total income, expenses, balance)
- Recent transactions list
- Add/edit/delete transactions
- Data visualization (charts)
- Category management
- Export data functionality

### User Profile
- Profile information management
- Password change
- Account deletion

## Implementation Steps
1. Create project structure and basic HTML files
2. Implement CSS styling and responsive design
3. Develop authentication system
4. Build dashboard with transaction management
5. Implement data visualization
6. Add profile management features
7. Final testing and optimization

## Data Models

### User
```javascript
{
  id: string,
  name: string,
  email: string,
  password: string, // hashed in real implementation
  createdAt: date
}
```

### Transaction
```javascript
{
  id: string,
  userId: string,
  type: 'income' | 'expense',
  amount: number,
  category: string,
  description: string,
  date: date
}
```

### Category
```javascript
{
  id: string,
  name: string,
  type: 'income' | 'expense',
  color: string
}
