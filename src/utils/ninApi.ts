import originalFetch from "isomorphic-unfetch";
import fetchBuilder from "fetch-retry-ts";
import { useStore } from "../Context";
import { parseJsonRes } from "./parseJsonRes";

export const baseURL = "https://hmis-tests.health.go.ug/db-api/api/v2";
export const defaultToken =
	"d2p_C3GIIK9IHPfzo87XNofax2uVawoLYhvlMgtZhBL98AlV0y8EId";


const options = {
	retries: 3,
	retryDelay: 1000,
	retryOn: [419, 503, 504],
};

const fetch = fetchBuilder(originalFetch);

export const useNinApi = () => {
	const store = useStore().apiStore;

	

	return {
		getNINPerson: async (nin) => {
			return fetch(`${baseURL}/getPerson`, {
				method: "POST",
				...options,
				body: JSON.stringify({
					nationalId: nin,
					token: store.ninToken,
					method: 'getPerson'
				}),
			}).then((response) => parseJsonRes(response));
		},
		getNINPlaceOfBirth: async (nin) => {
			return fetch(`${baseURL}/getPlaceOfResidence`, {
				method: "POST",
				...options,
				body: JSON.stringify({
					nationalId: nin,
					token: store.ninToken,
					method: 'getPlaceOfResidence'
				}),
			}).then((response) => parseJsonRes(response));
		}
	}
}

