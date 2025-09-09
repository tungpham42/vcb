import type { Handler } from "@netlify/functions";
import axios from "axios";

const VCB_URL =
  "https://portal.vietcombank.com.vn/Usercontrols/TVPortal.TyGia/pXML.aspx?b=10";

export const handler: Handler = async () => {
  try {
    const response = await axios.get(VCB_URL, { responseType: "text" });
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/xml",
        "Access-Control-Allow-Origin": "*",
      },
      body: response.data,
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: "Error fetching data",
    };
  }
};
