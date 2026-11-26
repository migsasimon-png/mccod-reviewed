import originalFetch from "isomorphic-unfetch";
import fetchBuilder from "fetch-retry-ts";
import { useStore } from "../Context";

export const baseURL = "https://hmis.health.go.ug/db-api/api/v2";
export const defaultToken =
	"d2p_klok96KmVsASkyZsn7BdXKeWX15Jo9DTwn9uH5FqziS90DBaeH";


const options = {
	retries: 3,
	retryDelay: 1000,
	retryOn: [419, 503, 504],
};

const fetch = fetchBuilder(originalFetch);

export const useNinApi = () => {
	const store = useStore().apiStore;
	const isLocal = process.env.NODE_ENV === "development" &&
		["localhost", "127.0.0.1"].includes(window.location.hostname);
	const endpoint = isLocal ? "/db-api/api/v2" : baseURL;
	const lookup = async (nin: string, method: string) => {
		if (!store.ninToken?.trim()) throw new Error("NIRA lookup has no configured token.");
		const response = await fetch(`${endpoint}/${method}`, {
			method: "POST",
			...options,
			headers: { "Content-Type": "application/json", Accept: "application/json" },
			body: JSON.stringify({ nationalId: nin, token: store.ninToken, method }),
		});
		const result = await response.json().catch(() => undefined);
		if (!response.ok) {
			const code = result?.data?.error?.code ?? result?.error?.code;
			if (String(code) === "320") return { data: { error: { code } } };
			throw new Error(`NIRA endpoint returned HTTP ${response.status}.`);
		}
		if (!result || typeof result !== "object") {
			throw new Error("NIRA endpoint did not return a JSON record.");
		}
		return result.error ? { data: { error: result.error } } :
			"data" in result ? result : { data: result };
	};

	return {
		getNINPerson: (nin: string) => lookup(nin, "getPerson"),
		getNINPlaceOfBirth: (nin: string) => lookup(nin, "getPlaceOfResidence"),
	}
}

