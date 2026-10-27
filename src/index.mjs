import puppeteer from 'puppeteer-core';
import fs from "fs";
import path from "path";
import XLSX from 'xlsx';

function convertXlsxToCsv(inputPath, outputPath) {
  // 1. Read the Excel workbook
  const workbook = XLSX.readFile(inputPath);

  // 2. Target the first sheet name
  const firstSheetName = workbook.SheetNames[0];

  // 3. Get the worksheet object
  const worksheet = workbook.Sheets[firstSheetName];

  // 4. Convert the worksheet to CSV format
  const csvData = XLSX.utils.sheet_to_csv(worksheet);

  // 5. Save the CSV data to a file
  fs.writeFileSync(outputPath, csvData, 'utf8');

  console.log(`Successfully converted ${inputPath} to ${outputPath}`);
}

const viewport = {
  width: 1920,
  height: 1080,
};

const launch = btoa(JSON.stringify({
  args: [`--window-size=${viewport.width},${viewport.height}`, '--user-data-dir=/data/easybank-session'],
}));

const browser = await puppeteer.connect({
  browserWSEndpoint: `ws://browserless:3000?launch=${launch}&stealth=true`,
  defaultViewport: viewport,
});

const page = await browser.newPage();
await page.setViewport(viewport);
await page.goto('https://banking.easybank.de/logintransaction/firstlevel');
console.log(await page.title());

await page.waitForSelector('#Password-field');

// await page.screenshot({ path: '1.png' });

console.log('Logging in with', process.env.EASYBANK_USERNAME)

await page.type('#UserName-field', process.env.EASYBANK_USERNAME);
await page.type('#Password-field', process.env.EASYBANK_PASSWORD);
await page.click('#btn-NextButton');

await page.waitForSelector('#TransactionOverviewMenuLabel-btn-box');

// await page.screenshot({ path: '2.png' });

await page.click('#TransactionOverviewMenuLabel-btn-box');

await page.waitForSelector('#TransactionViewExport');

// await page.screenshot({ path: '3.png' });

await page.click('#TransactionViewExport');

const cdp = await page.createCDPSession();

await cdp.send('Fetch.enable', {
  patterns: [{requestStage: 'Response'}]
});

cdp.on('Fetch.requestPaused', async (event) => {
  const {requestId, responseHeaders, request} = event;

  const isExcel = request.url.includes('ExportAsExcel') ||
    (responseHeaders && responseHeaders.some(h => h.name.toLowerCase() === 'content-type' && h.value.includes('excel')));

  if (isExcel) {
    console.log("Downloading file...");

    // Den Dateiinhalt als Base64 abrufen
    const responseBody = await cdp.send('Fetch.getResponseBody', {requestId});
    const buffer = Buffer.from(responseBody.body, responseBody.base64Encoded ? 'base64' : 'utf8');

    const fileName = "easybank.xlsx";
    const localPath = path.join(process.cwd(), 'downloads', fileName);
    fs.writeFileSync(localPath, buffer);

    console.log(`Successfully downloaded file to: ${localPath}`);

    await cdp.send('Fetch.failRequest', {requestId, errorReason: 'Aborted'});
  } else {
    await cdp.send('Fetch.continueRequest', {requestId});
  }
});

await page.waitForSelector('button#btn-btnExcel', {visible: true});
// await page.screenshot({ path: '4.png' });

console.log('Start download')
await page.click('button#btn-btnExcel');

console.log('wait for download')
await new Promise(resolve => setTimeout(resolve, 10000));
await browser.close();

convertXlsxToCsv('downloads/easybank.xlsx', 'downloads/easybank.csv');
