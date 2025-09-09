import axios from "axios";
import * as xml2js from "xml2js";

export const handler = async () => {
  try {
    const url =
      "https://portal.vietcombank.com.vn/Usercontrols/TVPortal.TyGia/pXML.aspx?b=10";

    const response = await axios.get(url);
    const result = await xml2js.parseStringPromise(response.data, {
      explicitArray: false,
    });

    const rates = result.ExrateList.Exrate.map((item: any) => ({
      code: item.$.CurrencyCode,
      name: item.$.CurrencyName,
      buy: item.$.Buy,
      transfer: item.$.Transfer,
      sell: item.$.Sell,
    }));

    // Add VND explicitly
    rates.push({
      code: "VND",
      name: "Vietnam Dong",
      buy: 1,
      transfer: 1,
      sell: 1,
    });

    return {
      statusCode: 200,
      body: JSON.stringify(rates),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.toString() }),
    };
  }
};
