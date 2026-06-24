# 🐄 Usman Dairy Farm — Complete Setup Guide

A professional dairy farm management system with cloud hosting. Track cows, milk production, expenses, and health records from any device.

## ✨ Features

- **Dashboard**: Real-time milk tracking, profit/loss, alerts, and analytics
- **Admin Panel**: CRUD operations for cows, milk, expenses, health records, buyers
- **Health Records**: Track vaccinations, treatments, checkups, and deworming
- **Advanced Reports**: Per-cow analytics, herd health, productivity rankings
- **Backup/Restore**: Download and restore complete farm data as JSON
- **PDF/Excel Export**: Generate professional reports and spreadsheets
- **Mobile App**: Installable on Android/iPhone with offline support
- **Dark Mode**: Eye-friendly interface
- **PWA**: Works offline, installable like native app
- **Security**: Login authentication with admin/viewer roles

## 🚀 Quick Start (5 minutes)

### Step 1: Create Free MongoDB Atlas Database

1. Go to [mongodb.com](https://www.mongodb.com/cloud/atlas)
2. Click **Sign Up** (or Sign In)
3. Create account or use Google/GitHub login
4. Click **Create** → **Build a Database**
5. Choose **FREE Tier**
6. Select region closest to you (Asia = Singapore/Mumbai)
7. Click **Create Cluster** (takes ~3 minutes)
8. When ready, click **Connect**
9. Choose **Drivers** → **Node.js** → **4.0 or later**
10. Copy the connection string that looks like:
    ```
    mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
    ```
11. **Replace PASSWORD with your actual password** (don't use special chars, or URL-encode them)
12. **Add `/usman-dairy?` at the end** so it becomes:
    ```
    mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/usman-dairy?retryWrites=true&w=majority
    ```

✅ **Keep this string safe — you'll need it next**

---

### Step 2: Deploy Backend to Railway

1. Go to [railway.app](https://railway.app)
2. Click **Start Project**
3. Choose **Deploy from GitHub repo**
4. If not logged in: Sign in with GitHub (or sign up)
5. **Authorize Railway** to access your GitHub
6. Click **Create New** → choose your dairy-manager repo
7. Click **Deploy**
8. Go to **Variables** tab and add:
   ```
   MONGO_URI = mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/usman-dairy?retryWrites=true&w=majority
   JWT_SECRET = usman_dairy_super_secret_change_this_2024
   PORT = 3000
   ```
9. Wait for deployment (green checkmark)
10. Copy the **Domain** URL (looks like `https://usman-dairy-backend.railway.app`)
11. In your frontend's `api.js`, replace:
    ```javascript
    const API = window.DAIRY_API || 'https://your-railway-url.railway.app';
    ```
    with your actual Railway URL

✅ **Backend is now live 24/7**

---

### Step 3: Deploy Frontend to GitHub Pages

1. In your GitHub repo, go to **Settings** → **Pages**
2. Under **Source**, select **main** branch
3. Select **/ (root)** folder
4. Click **Save**
5. Wait ~1 minute, refresh the page
6. You'll see: **Your site is published at `https://yourusername.github.io/dairy-manager`**

✅ **Frontend is now live — accessible from any device!**

---

### Step 4: First Time Setup

1. Open `https://yourusername.github.io/dairy-manager/` in your browser
2. You'll see the **First Time Setup** screen
3. Create your **Admin Username** and **Password**
4. Click **Create Account**
5. You're in! 🎉

---

## 📱 Access Your Farm

**From any device:**
- Desktop/Laptop: Open `https://yourusername.github.io/dairy-manager/`
- Mobile: Open same URL, tap **Install** (or add to home screen)
- Works **offline** too!

---

## 🔧 Configuration

### Customizing Farm Name

Edit `frontend/health.html`, `admin.html`, etc. and replace "Usman Dairy Farm" with your farm name.

### Changing Currency

In `style.css`, change all `Rs` to your currency ($ for USD, € for EUR, etc.)

### Adding Farm Logo

Replace `🐄` emoji with your logo URL in HTML files.

---

## 📊 Using the System

### Dashboard (Home)
- Real-time milk totals
- Profit/loss this month
- Alerts (low yield, missing data, high expenses)
- Cow performance charts
- Daily milk trends

### Admin Panel
- **Add Cows**: Name, breed, age, weight, calving date, lactation #
- **Add Milk**: Morning/evening amounts, fat%, buyer
- **Bulk Add**: Same milk amount for multiple cows at once
- **Add Expenses**: Feed, medicine, equipment, labor, misc
- **Track Buyers**: Milk buyer contacts and default rates
- **Set Milk Rate**: Update Rs/litre price anytime
- **Backup Data**: Download as JSON, restore anytime

### Health Records
- Track vaccinations (due dates with reminders)
- Treatment records
- Veterinary checkups
- Deworming schedules
- Vet contact info & costs

### Reports & Analytics
- **Per Cow Summary**: Total milk, revenue, expenses, profit/loss
- **Herd Health**: Active cows, average age, low yield count
- **Trends**: 12-month revenue/expense/milk chart
- **Productivity Ranking**: Ranked by milk production
- **Export**: PDF reports, Excel sheets

---

## 🔐 Security Tips

1. **Change JWT_SECRET** in Railway Variables to something unique:
   ```
   JWT_SECRET = your-super-secret-random-string-12345
   ```

2. **Use strong password** for your admin account (12+ characters, mix of letters/numbers)

3. **Add Viewer Accounts**: Admin panel has option to add viewer-only logins for family members

4. **Regular Backups**: Download backup from Admin panel once a month

---

## 🛠️ Troubleshooting

### Page shows "Cannot connect to server"
- Check if Railway deployment is running (green status on Railway dashboard)
- Verify `API` URL in `frontend/api.js` is correct
- Wait 1 minute and refresh

### Milk data not saving
- Check browser console (F12) for errors
- Ensure MongoDB connection string is correct in Railway Variables
- Try logging out and back in

### Charts not loading
- Clear browser cache (Ctrl+Shift+Delete)
- Hard refresh page (Ctrl+F5)

### Mobile app won't install
- Use Chrome/Android browser (Safari on iOS also works)
- Tap menu → "Install" or "Add to Home Screen"
- Make sure you're on HTTPS (it is, if using Railway + GitHub Pages)

---

## 📞 Support & Development

### To Add Features
- Edit frontend HTML/JS files
- Commit and push to GitHub
- GitHub Pages auto-updates in ~1 minute
- Test on your phone immediately

### To Backup Database
- Admin panel → **Download Backup**
- Saves complete JSON file
- Can restore anytime

### To Migrate to Own Server
- Backend: Deploy the `backend/` folder to any Node.js host
- Frontend: Deploy `frontend/` to any static host
- Same API endpoints

---

## 📋 Checklist

- [ ] Created MongoDB Atlas free database
- [ ] Deployed backend to Railway
- [ ] Deployed frontend to GitHub Pages
- [ ] Updated `api.js` with Railway URL
- [ ] Created admin account on first login
- [ ] Added your cows
- [ ] Tested milk entry (works on phone?)
- [ ] Installed mobile app
- [ ] Downloaded first backup

---

## 🎓 Tips for Best Experience

1. **Update milk daily** — set a phone alarm at 7 PM
2. **Add expenses immediately** — track spending right away
3. **Use mobile app** — faster than browser on slow connections
4. **Check reports monthly** — understand farm profitability
5. **Update vaccination dates** — set reminders for health checks
6. **Backup weekly** — protect your data

---

## ⚡ Performance Notes

- **Free tier limits**: MongoDB Atlas 512MB (~100k milk records), Railway 500 hours/month (plenty!)
- **Loading speed**: <2 seconds on 4G, instant on WiFi
- **Storage**: One year of daily farm data ≈ 50MB
- **Scalability**: Upgrade anytime without code changes

---

## 📚 Stack

**Frontend:**
- Vanilla JavaScript (no dependencies needed)
- Chart.js for visualizations
- jsPDF + SheetJS for exports
- PWA for offline support

**Backend:**
- Node.js + Express
- MongoDB for database
- JWT for authentication
- Hosted on Railway

**Deployment:**
- GitHub Pages (frontend)
- Railway (backend)
- MongoDB Atlas (database)

---

## 🚀 Future Enhancements

Possible additions (no extra cost):
- Email alerts for overdue vaccinations
- Milk quality trend analysis
- Breeding recommendations
- Feed cost optimization
- Multi-farm support
- SMS reminders

---

**Made with ❤️ for farmers. Happy farming! 🐄**

Questions? Check the browser console (F12) for error messages, or verify all three services (MongoDB, Railway, GitHub Pages) are running.
