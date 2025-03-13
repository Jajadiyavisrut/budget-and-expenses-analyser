# Budget Tracker Application

A web-based personal finance management tool that helps users track expenses, set budgets, and visualize spending patterns.

## Features

- Create and manage expense categories (up to 6 custom categories)
- Set monthly budgets for each category
- Record expenses with details:
  - Amount
  - Category
  - Description
  - Date
  - Payment Method (Cash, Online, Credit Card, Debit Card)
- Visualize budget vs. actual spending through charts
- View expense history organized by date
- Dark-themed glass-morphism UI design
- Responsive layout for all devices

## Technology Stack

### Frontend
- HTML5
- CSS3 with glass-morphism design
- JavaScript (Vanilla JS)
- Chart.js for data visualization
- Bootstrap 5.3.0 for responsive layouts

### Backend
- PHP 7.0+
- MySQL 5.6+
- RESTful API architecture

## Setup Instructions

1. **Prerequisites**
   - Web server (Apache/Nginx)
   - PHP 7.0 or higher
   - MySQL 5.6 or higher
   - Web browser with JavaScript enabled

2. **Database Setup**
   ```sql
   mysql -u root -p < config/init.sql
   ```
   This will create the database and required tables.

3. **Configuration**
   - Open `config/database.php`
   - Update the database connection settings:
     ```php
     define('DB_HOST', 'localhost');
     define('DB_USER', 'your_username');
     define('DB_PASS', 'your_password');
     define('DB_NAME', 'finance_manager');
     ```

4. **Web Server Configuration**
   - Place the project files in your web server's document root
   - Ensure the web server has write permissions for the project directory
   - Configure URL rewriting if needed

5. **Access the Application**
   - Open your web browser
   - Navigate to: `http://localhost/budget-tracker`
   - Start managing your expenses!

## Project Structure

```
budget-tracker/
├── api/                    # API endpoints
│   ├── BaseAPI.php        # Base API class
│   ├── categories.php     # Categories API
│   ├── budgets.php        # Budgets API
│   └── expenses.php       # Expenses API
├── config/                 # Configuration files
│   ├── database.php       # Database configuration
│   └── init.sql          # Database initialization
├── css/                   # Stylesheets
│   └── style.css         # Custom styles
├── js/                    # JavaScript files
│   └── app.js            # Main application logic
├── index.php             # Main entry point
└── README.md             # This file
```

## API Endpoints

### Categories
- `GET /api/categories.php` - Fetch all categories
- `POST /api/categories.php` - Create a new category
- `PUT /api/categories.php` - Update an existing category
- `DELETE /api/categories.php?id={id}` - Delete a category

### Budgets
- `GET /api/budgets.php` - Fetch all budgets
- `GET /api/budgets.php?month={YYYY-MM}` - Fetch budgets for a specific month
- `POST /api/budgets.php` - Create a new budget
- `PUT /api/budgets.php` - Update an existing budget
- `DELETE /api/budgets.php?id={id}` - Delete a budget

### Expenses
- `GET /api/expenses.php` - Fetch all expenses
- `GET /api/expenses.php?month={YYYY-MM}` - Fetch expenses for a specific month
- `POST /api/expenses.php` - Create a new expense
- `PUT /api/expenses.php` - Update an existing expense
- `DELETE /api/expenses.php?id={id}` - Delete an expense

## Security Considerations

- Input validation and sanitization implemented
- SQL injection prevention through prepared statements
- CORS configuration for API access control
- Error handling with safe error messages
- No sensitive information exposure in responses

## Browser Compatibility

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Minimum screen width: 320px (mobile-responsive)

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License. 