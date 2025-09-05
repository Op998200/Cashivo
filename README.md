# Cashivo - Personal Finance Tracker

A modern, responsive personal finance management application built with HTML, CSS, and JavaScript, powered by Supabase.

## Features

- **Transaction Tracking**: Record income and expenses with categories
- **Visual Analytics**: Interactive charts and financial insights
- **Budget Management**: Set and monitor spending limits
- **Profile Management**: Complete user profile with avatar upload
- **Secure Authentication**: User registration and login
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Supabase (PostgreSQL, Authentication, Storage)
- **Charts**: Chart.js
- **Styling**: Custom CSS with modern design patterns

## Quick Start

1. Clone the repository
2. Open `index.html` in your browser
3. Register a new account or login
4. Start tracking your finances!

## File Structure

```
cashivo-v2/
├── index.html              # Landing page
├── login.html              # Login page
├── register.html           # Registration page
├── dashboard-mvp.html      # Main dashboard
├── profile.html            # User profile page
├── assets/                 # Static assets
│   └── default-avatar.png
├── css/                    # Stylesheets
│   ├── modern-styles.css   # Main stylesheet
│   └── profile-enhancements.css
├── js/                     # JavaScript files
│   ├── auth.js             # Authentication
│   ├── mvp-dashboard.js    # Dashboard functionality
│   ├── profile.js          # Profile management
│   ├── charts.js           # Chart utilities
│   └── supabaseClient.js   # Supabase configuration
├── docs/                   # Documentation
└── database.sql            # Database schema
```

## Development

### Prerequisites

- Modern web browser
- Supabase account (for backend services)

### Setup

1. Configure your Supabase credentials in `js/supabaseClient.js`
2. Run the database setup scripts in `database.sql`
3. Open `index.html` to start the application

## Deployment

The application is static and can be deployed to any web hosting service:

- Netlify
- Vercel
- GitHub Pages
- AWS S3 + CloudFront

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For questions or issues, please open an issue on GitHub.
