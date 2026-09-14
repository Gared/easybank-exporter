# easybank-exporter

Automates easybank login and transaction export

## Setup & Run

1. Create `.env.local`:
   ```env
   EASYBANK_USERNAME=your_username
   EASYBANK_PASSWORD=your_password
   ```
2. Start the App and Browserless with Docker Compose:
   ```bash
   docker compose up
   ```
3. Use the files in `downloads` directory:
   - easybank.xlsx
   - easybank.csv

## Flow

- Opens easybank login
- Signs in with credentials from `.env.local`
- Navigates to transaction export
- Download transactions as Excel
- Converts Excel to CSV

