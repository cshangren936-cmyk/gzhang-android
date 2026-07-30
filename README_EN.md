# G.账 v0.4.0



[中文](README.md) 


G.账 is a personal finance and bookkeeping application designed for Android. Its default base currency is Malaysian Ringgit (MYR), and it supports both Chinese and English.



## Features



### Bookkeeping



- Income, expenses, account transfers, and transfer fees

- Built-in calculator for addition, subtraction, multiplication, and division

- Remembers the unallocated balance when splitting a payment into multiple records

- Itemized bills with individual item names, quantities, and prices

- Receipt, invoice, and product screenshot attachments

- Custom subcategories and multiple tags

- Partial and full refunds linked to the original transaction

- Detailed transaction viewing and editing

- Multiple bookkeeping ledgers

- Advanced search by keyword, date range, account, category, and amount



### Accounts and Liabilities



- Cash, bank, e-wallet, savings, credit card, and Buy Now Pay Later accounts

- Wallet-style stacked account cards

- Manual account balance adjustment with an adjustment record

- Credit limits, outstanding balances, instalments, due dates, and repayments

- Tracks “Money owed to me” and “Money I owe”

- Partial debt repayments and one-tap settlement

- Automatic net worth calculation, including personal debts and credit liabilities

- One-tap hiding of sensitive account balances



### Recurring Payments and Instalments



- Monthly recurring payment rules for rent, subscriptions, utilities, and other bills

- Automatically creates pending entries for confirmation

- Credit card and BNPL instalment schedules

- Principal and service fee distribution across future months

- Android system notifications for recurring payments, instalments, and due dates



### Split Bills and Group Settlement



- Supports different consumption and payment amounts for every participant

- Tax, service charges, and discounts are distributed according to actual consumption

- Generates a minimum-transfer settlement plan

- Each participant may use different currencies for consumption and payment

- Settlement history with editing, deletion, copying, and system sharing

- Suitable for group meals and multi-person trips



### Multiple Currencies



- Supports MYR, USD, SGD, JPY, CNY, EUR, GBP, AUD, THB, and other currencies

- Converts foreign transactions into the selected base currency

- Retrieves the latest available reference exchange rates

- Stores the most recently downloaded rates for offline use

- Multi-currency conversion for split-bill settlement



### Receipt Recognition



- Captures or selects receipt images

- On-device Android recognition for merchants, dates, totals, taxes, service charges, and items

- Local rule-based category suggestions

- Android Quick Settings tile for screenshot recognition

- Recognition results are placed into pending entries for confirmation

- Recognition does not directly change account balances without confirmation



### Electronic Assets



- Records asset name, purchase amount, purchase date, warranty, serial number, configuration, and notes

- Links assets to their original transaction and receipt

- Calculates days used and average daily cost

- Displays warranty days remaining

- Custom daily-cost target and payback status

- Warranty expiration reminders

- Records maintenance, repairs, accessories, residual value, sale amount, and sale date

- Complete asset lifecycle history



### Reports



- Monthly income, expenses, and balance

- Spending by category

- Monthly expense ranking

- Spending calendar

- Monthly category budgets and overspending indicators

- Month-over-month comparisons

- Year-over-year comparisons

- Total assets, liabilities, personal debts, and net worth



### Backup and Synchronization



- Complete JSON backup and restoration

- CSV transaction export

- Receipt images are stored in an IndexedDB attachment library

- Portable backups include image attachments

- Manual WebDAV backup upload and download

- Can use a personal WebDAV location as a multi-device or shared bookkeeping space

- Local member and role information for shared ledgers



### AI Assistant



- Configurable Chat Completions-compatible endpoint

- User-configurable model name and API key

- Monthly income and spending analysis

- Disabled by default

- Data is sent only when the user manually requests an analysis

- Original receipt images are not sent to the configured AI service



### Interface



- Warm journal-style design with grid paper, paper tape, and light hand-drawn details

- Wallet-style account page

- Chinese and English language switching

- Light and dark themes

- Portrait orientation only

- The top-left brand mark displays only `G.`



## Data and Network Usage



G.账 follows a local-first approach with optional online features.



Bookkeeping data is stored locally on the device. Exchange rates are downloaded and cached when a network connection is available. WebDAV transfers occur only when the user manually selects upload or download. AI data is sent only after the AI feature is configured, enabled, and manually activated.



Receipt recognition uses ML Kit models packaged with the Android application and can operate without an internet connection.



Before uninstalling the application or changing devices, export a complete backup from inside the app.



Android’s screen-capture privacy mechanism applies to the Quick Settings recognition feature. On Android 14 and later, the user must approve every screen-capture session.



## Android Build Requirements



- Android Studio with Android SDK

- Node.js 20 or later

- JDK 17

- Internet connection for the first Gradle dependency download



## Build Instructions



After cloning the repository, run the following commands from the project root:



```bash

npm install

npm run android:sync

npm run android:open

```



In Android Studio:



1\. Wait for Gradle Sync to finish.

2\. Select an emulator or connected Android device.

3\. Use --Run-- to test the application.

4\. To generate an APK, select --Build > Build APK(s)--.



The Android project is located in the `android/` directory.



The first Android build may download ML Kit and WorkManager dependencies. ML Kit recognition models are packaged into the APK, allowing receipt recognition to work offline after installation.



## Quick Settings Screenshot Recognition



1\. Install and open G.账 at least once.

2\. Open the Android Quick Settings panel.

3\. Select the edit or pencil button.

4\. Add the `G.账 Capture` tile to Quick Settings.

5\. Open a payment or receipt screen.

6\. Tap the tile and approve the Android screen-capture request.

7\. Open G.账 and confirm the result under --More > Pending Entries--.



Android 14 and later require screen-capture permission for every capture session.



## Testing



Run:



```bash

npm test

```



The automated tests cover:



- BNPL purchases and repayments

- Account balance calculations

- Refund handling

- Recurring and instalment schedules

- Bookkeeping calculator

- Unequal split-bill settlements

- Proportional tax and service-charge distribution

- Minimum-transfer settlement

- Multi-currency conversion

- Electronic asset daily cost and warranty countdown

- Receipt text parsing

- Automatic category suggestions



## AI Configuration



Go to:



```text

More > AI Money Assistant

```



Enter a compatible endpoint, model name, and API key.



The AI feature is disabled by default. When manually activated, it sends only the monthly bookkeeping summary shown in the interface. Receipt images are not included.



Do not commit API keys, WebDAV passwords, or personal bookkeeping backups to GitHub.



## v0.4 Beta Notes



This version focuses on making every planned feature available through a usable workflow.



Cloud sharing currently uses a user-owned WebDAV file. It does not include a centralized account system, real-time simultaneous editing, automatic conflict resolution, or fine-grained server permissions.



When multiple people use the same remote bookkeeping file, download the latest version before making changes and upload it after finishing.



Future versions will focus on:



- Automatic synchronization conflict handling

- Native Android device compatibility testing

- UI and interaction refinements

- Natural-language AI bookkeeping

- Improved multi-user collaboration



## Privacy



This project may process sensitive personal financial information. Never upload the following files to GitHub:



- Personal bookkeeping backup files

- Receipt images containing personal information

- AI API keys

- WebDAV passwords

- Android signing keystores

- `local.properties`

- `google-services.json`



