
# 🛒 Multivendor Ecommerce Marketplace

A full-stack multivendor eCommerce platform built with Django and React, where multiple sellers can manage their products and customers can browse, shop, and purchase products through a seamless shopping experience.

<p align="center">
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=white" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
</p>

## 🌐 Live Demo

🔗 **Live Website:** [FlipBox](https://flipbox-marketplace.vercel.app/)

## ✨ Features

### 👤 Customer Features
- User registration and login
- JWT-based authentication
- Browse products by categories
- Search and explore products
- View detailed product information
- Add products to cart and wishlist
- Update product quantities and manage cart
- Secure checkout process
- Cash on Delivery payment option
- SSLCommerz online payment integration
- Product ratings and reviews

### 🏪 Seller Features
- Dedicated seller dashboard
- Add, update, and delete products
- Manage product descriptions and pricing
- Track product stock and availability
- Manage product listings

### ⚙️ Admin Features
- Django administration panel
- Manage users and marketplace data
- Manage products and orders

## 🛠️ Tech Stack

| Category | Technologies |
|---|---|
| Frontend | React.js, JavaScript, Tailwind CSS |
| Backend | Python, Django, Django REST Framework |
| Authentication | JWT |
| Database | PostgreSQL |
| Payment Gateway | SSLCommerz |
| Deployment | Vercel, Render |

## 🚀 Getting Started

Follow these steps to run the project locally.

### 📋 Prerequisites

- Python 3.10+
- Node.js and npm
- PostgreSQL

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/indrojchowdhury/Multivendor_Ecommerce_Marketplace.git

cd Multivendor_Ecommerce_Marketplace
```

### 2️⃣ Backend Setup

```bash
cd backend

python -m venv venv
```

Activate the virtual environment:

**Windows:**
```bash
venv\Scripts\activate
```

**Linux / macOS:**
```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Configure your backend environment variables in a `.env` file.

Run database migrations:

```bash
python manage.py migrate
```

Start the development server:

```bash
python manage.py runserver
```

### 3️⃣ Frontend Setup

Open a new terminal:

```bash
cd frontend

npm install
```

Configure your frontend environment variables in a `.env` file.

Start the frontend development server:

```bash
npm run dev
```

## 🔐 Environment Variables

### Backend (`.env`)

```env
SECRET_KEY=your_secret_key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

DATABASE_URL=your_database_url

STORE_ID=your_sslcommerz_store_id
STORE_PASSWORD=your_sslcommerz_store_password
```

### Frontend (`.env`)

```env
VITE_API_URL=http://127.0.0.1:8000/api
```

⚠️ Never commit your actual environment variables, API keys, or secret credentials to GitHub.

## 🔌 API Modules

The backend provides RESTful APIs for:

- Authentication
- Product Management
- Category Management
- Cart Management
- Wishlist Management
- Order Management
- Payment Processing
- Product Reviews and Ratings

## 🔮 Future Improvements

- Marketplace commission management
- Seller earnings and payout management
- Advanced analytics and reporting

---

<p align="center">
  💻 Built with ❤️ using Django, React, and PostgreSQL
</p>
