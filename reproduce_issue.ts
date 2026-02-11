import { parseSSC } from "./lib/parser";

async function run() {
    const url = "https://ssc.digialm.com//per/g27/pub/32874/touchstone/AssessmentQPHTMLMode1//32874O2613/32874O2613S1D441/17696083666914484/2201260805_32874O2613S1D441E1.html";
    console.log(`Fetching ${url}...`);
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const html = await response.text();
        console.log(`Fetched ${html.length} bytes.`);

        console.log("Parsing...");
        const result = parseSSC(html, "tier2"); // Assuming tier2 based on URL but will check config
        console.log("Parse Success!");
        console.log(JSON.stringify(result, null, 2));

    } catch (error) {
        console.error("Parse Failed:");
        console.error(error);
    }
}

run();
