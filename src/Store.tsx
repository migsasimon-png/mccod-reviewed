import { action, computed, observable, runInAction } from "mobx";
import { escapeRegExp, flatten, fromPairs, isArray } from "lodash";
import moment from "moment";
import englishMeta from "./components/LanguageConfigPage/fullMetaData.json";
import { CauseOfDeathFilter } from "./filters";
import { ApiStore } from "./stores/api";
import { Space, notification } from "antd";
import { addZZZZ } from "./utils/download-utils";
import React from "react";

const analyticsjson = require("./assets/analytics.json");

const _ = require("lodash");
const anacodpopulation = require("./assets/anacodpopulation.json");

const normalizeAuthHeader = (raw?: string) => {
	if (!raw) return undefined;
	const value = String(raw).replace(/^["']|["']$/g, "").trim();
	if (!value) return undefined;
	if (/^(Basic|ApiToken)\s/i.test(value)) return value;
	if (value.startsWith("d2p_")) return `ApiToken ${value}`;
	return value;
};

const extraHeaders =
	process.env.NODE_ENV === "development" &&
	/localhost|127\.0\.0\.1/.test(window.location.hostname)
		? {
				Authorization: normalizeAuthHeader(
					process.env.REACT_APP_DHIS2_AUTHORIZATION
				),
		  }
		: {};

export const dateFields = [
	"eventDate",
	"RbrUuKFSqkZ",
	"i8rrl8YWxLF",
	"j5TIQx3gHyF",
	"U18Tnfz9EKd",
];

export const mcodmap = {
	hcu4LCAMSkz: "dsiwvNQLe5n", // village
	ByIsCiqkq4v: "ymyLrfEcYkD",
	jdxl2rdeDEk: "lQ1Byr04JTx",
	WzauwhVOwM0: "i8rrl8YWxLF",
	eJwpqR9t7YM: "RJhbkjYrODG",
	FIfoObQJvNp: "ZYKmQ9GPOaF",
	H34bcwaOliX: "FGagV1Utrdh",  //form 17 inpatient number
	BRtcz4HV7Ak: "FGagV1Utrdh", //form 20 inpatient number
	uFoaTRJ16Ch: "gNM2Yhypydx",
	K4FUK590rIU: "KsGOxFyzIs1",
	FHmHV9mElbD: "u44XP9fZweA", // district
	ioXkKfrgCJa: "t5nTEmlScSt", // subcounty
	iJqBq0kQtWO: "q7e7FOXKnOf", // age mapping for 020
	AqXDMjrPUEE: "Z41di0TRjIu",
	XW2CKaAiMKc: "xAWYJtQsg8M",
	js6jQi1rx1j: "jY3K6Bv4o9Q",
	ZKBE8Xm9DJG: "ZKBE8Xm9DJG",
	itNUbtIXfCT: "ZKBE8Xm9DJG",
	sfpqAeqKeyQ: "sfpqAeqKeyQ",
	zb7uTuBCPrN: "zb7uTuBCPrN",
	CnPGhOcERFF: "CnPGhOcERFF",
	xeE5TQLvucB: "xeE5TQLvucB",
	Ylht9kCLSRW: "Ylht9kCLSRW",
	myydnkmLfhp: "myydnkmLfhp",

	Q7VM7swIWb6: "Q7VM7swIWb6",
	QmcOqkcNTip: "QmcOqkcNTip",
	tuGPnGHWqQn: "tuGPnGHWqQn",

	QGFYJK00ES7: "QGFYJK00ES7",
	aC64sB86ThG: "aC64sB86ThG",

	cmZrrHfTxW3: "cmZrrHfTxW3",
	eCVDO6lt4go: "eCVDO6lt4go",
	hO8No9fHVd2: "hO8No9fHVd2",
	fleGy9CvHYh: "fleGy9CvHYh",
	WkXxkKEJLsg: "WkXxkKEJLsg",
	CupbOInqvJI: "MOstDqSY0gO",

	xpJgWYFpvht: "ZYKmQ9GPOaF", // form 017 mother initials as baby name
	// babyName: "ZYKmQ9GPOaF", // form 017
	ZBvxrMFv9aW: "e96GB4CXyd3", // sex form 017
	//rjoVXlCWLYM: "WYykJO0Vh3s",  //age in Months
	rjoVXlCWLYM: "TgFI46omIEg", // age in minutes form 017
	rDI0uhcVLAk: "VJXpmHCaAFG", // age in hours form 017
	quKRjZzkSRA: "v8mvHHXo06E", // age in days form 017
	m8jUvzBgYga: "lQ1Byr04JTx", // Number of completed weeks of pregnancy form 017
	RpkIvgOOZJt: "RbrUuKFSqkZ", // date & time of delivery form 017 → Date of Birth in MCCOD
	hTYVRRvhYEt: "DdfDMFW4EJ9", // mother's age (years) form 017 → Age of mother in MCCOD (100-FD07)
	dKQIx7sVFbD: "bNpMzyShDCX", // parish form 017 → Usual Residence-Parish in MCCOD (100-DD04b)
	T0f4UTwxd6Q: "dsiwvNQLe5n", // village form 017
	t5nTEmlScSt: "u44XP9fZweA", // district form 017
	u44XP9fZweA: "t5nTEmlScSt", // subcounty form 017
	Dq9aH0aZ2wb: "i8rrl8YWxLF", // date and time of death form 017
	ZkNDFfFSTYg: "ZkNDFfFSTYg", // linked value
};

const dlcolumns = [
	"ZKBE8Xm9DJG",
	"ZYKmQ9GPOaF",
	"FGagV1Utrdh",
	"MOstDqSY0gO",
	"Q7VM7swIWb6",
	"QmcOqkcNTip",
	"tuGPnGHWqQn",

	"zwKo51BEayZ",
	"bNpMzyShDCX",
	"u44XP9fZweA",
	"b70okb06FWa",
	"t5nTEmlScSt",
	"dsiwvNQLe5n",
	"RbrUuKFSqkZ",
	"q7e7FOXKnOf",
	"e96GB4CXyd3",
	"xNCSFrgdUgi",
	"i8rrl8YWxLF",

	"sfpqAeqKeyQ",
	"zD0E77W4rFs",
	"cSDJ9kSJkFP",
	"Ylht9kCLSRW",
	"zb7uTuBCPrN",
	"tuMMQsGtE69",
	"uckvenVFnwf",
	"myydnkmLfhp",
	"C8n6hBilwsX",
	"ZFdJRT3PaUd",
	"aC64sB86ThG",
	"QTKk2Xt8KDu",
	"IeS8V8Yf40N",
	"Op5pSvgHo1M",
	"cmZrrHfTxW3",
	"dTd7txVzhgY",
	"xeE5TQLvucB",
	"Kk0hmrJPR90",
	"j5TIQx3gHyF",
	"JhHwdQ337nn",
	"jY3K6Bv4o9Q",
	"UfG52s4YcUt",
	"FhHPxY16vet",
	"gNM2Yhypydx",
	"wX3i3gkTG4m",
	"KsGOxFyzIs1",
	"tYH7drlbNya",
	"xDMX2CJ4Xw3",
	"b4yPk98om7e",
	"fQWuywOaoN2",
	"o1hG9vr0peF",
	"AZSlwlRAFig",
	"U18Tnfz9EKd",
	"DKlOhZJOCrX",
	"kGIDD5xIeLC",
	"mDez8j7furx",

	"V4rE1tsj5Rb",
	"ivnHp4M4hFF",
	"jf9TogeSZpk",
	"lQ1Byr04JTx",
	"xAWYJtQsg8M",
	"DdfDMFW4EJ9",
	"GFVhltTCG8b",
	"zcn7acUB6x1",
	"AJAraEcfH63",
	"RJhbkjYrODG",
	"ymyLrfEcYkD",
	"K5BDPJQk1BP",
	"Z41di0TRjIu",
	"uaxjt0inPNF",
	"u9tYUv6AM51",

	"ZXZZfzBpu8a",
	"cp5xzqVU2Vw",
	"lu9BiHPxNqH",
	"PaoRZbokFWJ",

	// "WkXxkKEJLsg",
	// "fleGy9CvHYh",
	// "hO8No9fHVd2",
	// "eCVDO6lt4go",
	// "QGFYJK00ES7",
	// "CnPGhOcERFF",
	// "cSDJ9kSJkFP",
	// "k9xdBQzYMXo",
	// "yftBZ5bSEOb",
	// "fJUy96o8akn",
	// "S53kx50gjQn",
	// "ctbKSNV2cg7",
	// "KpfvNQSsWIw",
	// "sJhOdGLD5lj",
	// "L97MrANAav9",
	// "twVlVWM3ffz",
	// "L97MrAMAav9",
	// "se3wRj1bYPo",
];

const orgQuery = {
	orgs: {
		// userOrgUnits
		resource: "organisationUnits.json",
		params: {
			paging: "false",
			fields: "id,name,path,leaf,level,parent[id]",
		},
	},
};

const initQuery = {
	me: {
		resource: "me",
		params: {
			fields: "id,name,username,surname,firstName",
		},
	},
	program: {
		// programOrganisationUnits
		resource: `programs/vf8dN49jprI`,
		params: {
			fields:
				"organisationUnits[id,name,ancestors[id,name,level]],programStages[programStageDataElements[displayInReports,dataElement[id,name,code]]]",
		},
	},
	// categories: {
	// 	resource: "categories.json",
	// 	params: {
	// 		fields: "name,id,code,categoryOptions[id,name]",
	// 		paging: "false",
	// 		filter: "code:in:[RT01]",
	// 	},
	// },
	options: {
		resource: "optionSets.json",
		params: {
			fields: "id,code,options[code,name]",
			paging: "false",
			filter:
				"code:in:[SX01,YN01,MD01,PD01,TI01,100U,100ATPOINT,100RefLevels,Age_Type,HMIS_100 Place of death out of facility]",
		},
	},
};
const categoryOptionCombos = [
	{
		name: "1. National",
		id: "l4UMmqvSBe5",
	},
	{
		name: "2. Foreigner",
		id: "VJU0bY182ND",
	},
	{
		name: "3. Refugee",
		id: "wUteK0Om3qP",
	},
];

export const age_ranges = [
	"age_00",
	"age_01",
	"age_05",
	"age_10",
	"age_15",
	"age_20",
	"age_25",
	"age_30",
	"age_35",
	"age_40",
	"age_45",
	"age_50",
	"age_55",
	"age_60",
	"age_65",
	"age_70",
	"age_75",
	"age_80",
	"age_85",
	"age_90",
	"age_95",
	"age_unknown",
];

class Store {
	@observable engine: any;
	@observable apiStore: ApiStore = new ApiStore();
	@observable fetchingOrgUnits: boolean = false;
	@observable user: any = null;
	@observable userOrgUnits: any = [];
	@observable userOrgUnitsLoaded: boolean = false;
	@observable nationalitySelect: any;
	@observable actualSelOrgUnit: any;
	@observable selectedOrgUnit: any;
	@observable selectedLevel: any;
	@observable activeLanguage: any;
	@observable ICDLang: any = null;
	@observable programs: any = [];
	@observable selectedNationality: any;
	@observable optionSets: any;
	@observable page = 1;
	@observable pageSize = 10;
	@observable total = 0;
	@observable program = "vf8dN49jprI";
	@observable programStage = "aKclf7Yl1PE";
	@observable attributeCC = "UjXPudXlraY";
	@observable data: any;
	@observable sorter = "created:desc";
	@observable search = "";
	@observable currentPage = "1";
	@observable activeModule: "home" | "records" | "mdr" | "pdr" | "cdr" | "mccod" = "home";
	@observable activeFormId: "mdr" | "pdr" | "cdr" | "mccod" | null = null;
	@observable programOrganisationUnits = []; /** !!!!!!!!!! */
	@observable allOrgUnits: any = null;
	@observable currentEvent: any;
	@observable currentEventObj: any;
	@observable roles: any = [];
	@observable programExists = null;
	@observable viewMode = false;
	@observable editing = false;
	@observable forceDisable = false;
	@observable availableDataElements = [];
	@observable availablePrintDataElements = [];
	@observable ICDAltSearchtextA: any;
	@observable attributesExist: boolean | null = null;
	@observable topDiseases: any;
	@observable selectedCauseOfDeath: string | null = null;
	@observable allDiseases: any;
	@observable allIndis: any = {};
	@observable prevDiseases: any;
	@observable prevDiseaseOrgUnits: any = {};
	@observable totalCauseDeathCount: number = 0;
	@observable totalDeathCount: number = 0;
	@observable loadingTopDiseases: boolean = false;
	@observable selectedDateRange: [string, string, string] | null = null;
	@observable selectedDlDateRange: [string, string] | null = null;
	@observable searchIds: any;
	@observable allDeaths: any[] = [];
	@observable filters: any = {};
	@observable lsdata: any = null;
	@observable isIframeEdit: boolean = false;
	@observable allDisabled: any = {
		ZKBE8Xm9DJG: false,
		ZYKmQ9GPOaF: false,
		Q7VM7swIWb6: false,
		QmcOqkcNTip: false,
		tuGPnGHWqQn: false,
		MOstDqSY0gO: false,
		zwKo51BEayZ: false,
		bNpMzyShDCX: false,
		u44XP9fZweA: false,
		b70okb06FWa: false,
		t5nTEmlScSt: false,
		dsiwvNQLe5n: false,
		NPE6arvf4mF: false,
		sA334hwknqq: false,
		FAsTh8L7Yrw: false,
		RbrUuKFSqkZ: false,
		q7e7FOXKnOf: false,
		e96GB4CXyd3: false,
		i8rrl8YWxLF: false,
		xNCSFrgdUgi: false,
		zcn7acUB6x1: false,
		KpfvNQSsWIw: false,
		AJAraEcfH63: false,
		RJhbkjYrODG: false,
		ymyLrfEcYkD: false,
		K5BDPJQk1BP: false,
		Z41di0TRjIu: false,
		uaxjt0inPNF: false,
		V4rE1tsj5Rb: false,
		ivnHp4M4hFF: false,
		jf9TogeSZpk: false,
		lQ1Byr04JTx: false,
		GFVhltTCG8b: false,
		xAWYJtQsg8M: false,
		DdfDMFW4EJ9: false,
		sfpqAeqKeyQ: false,
		Ylht9kCLSRW: false,
		zb7uTuBCPrN: false,
		QGFYJK00ES7: false,
		CnPGhOcERFF: false,
		myydnkmLfhp: false,
		aC64sB86ThG: false,
		cmZrrHfTxW3: false,
		U18Tnfz9EKd: false,
		QTKk2Xt8KDu: false,
		DKlOhZJOCrX: false,
		xeE5TQLvucB: false,
		FhHPxY16vet: false,
		KsGOxFyzIs1: false,
		gNM2Yhypydx: false,
		tYH7drlbNya: false,
		fQWuywOaoN2: false,
		Kk0hmrJPR90: false,
		b4yPk98om7e: false,
		j5TIQx3gHyF: false,
		wX3i3gkTG4m: false,
		JhHwdQ337nn: false,
		xDMX2CJ4Xw3: false,
		o1hG9vr0peF: false,
		jY3K6Bv4o9Q: false,
		AZSlwlRAFig: false,
		UfG52s4YcUt: false,
		kGIDD5xIeLC: false,
		mDez8j7furx: false,
		WkXxkKEJLsg: false,
		fleGy9CvHYh: false,
		hO8No9fHVd2: false,
		zD0E77W4rFs: false,
		eCVDO6lt4go: false,
		tuMMQsGtE69: false,
		C8n6hBilwsX: false,
		IeS8V8Yf40N: false,
		sJhOdGLD5lj: false,
		k9xdBQzYMXo: false,
		yftBZ5bSEOb: false,
		fJUy96o8akn: false,
		S53kx50gjQn: false,
		L97MrANAav9: false,
		cSDJ9kSJkFP: false,
		uckvenVFnwf: false,
		ZFdJRT3PaUd: false,
		Op5pSvgHo1M: false,
		//cSDJ9kSJkFP: false,
		//uckvenVFnwf: false,
		//ZFdJRT3PaUd: false,
		//Op5pSvgHo1M: false,
		ctbKSNV2cg7: false,
		T4uxg60Lalw: false,
		twVlVWM3ffz: false,
		QDHeWslaEoH: false,
		WqYvFt79TQB: false,
		se3wRj1bYPo: false,
		WYykJO0Vh3s: false,
		TgFI46omIEg: false,
		VJXpmHCaAFG: false,
		v8mvHHXo06E: false,
	};

	@action showEvents = () => {
		// console.log("shw orggg", this.actualSelOrgUnit)
		this.data = null;
		this.edit();
		this.currentEvent = null;
		this.editing = false;
		this.selectedOrgUnit = this.actualSelOrgUnit ?? this.selectedOrgUnit;
		this.currentPage = "1";
	};
	@action openModule = (m: "home" | "records" | "mdr" | "pdr" | "cdr" | "mccod") => {
		this.activeModule = m;
		if (m === "mdr" || m === "pdr" || m === "cdr" || m === "mccod") {
			this.activeFormId = m;
		} else {
			this.activeFormId = null;
		}
		if (m === "records") {
			// Legacy MCCOD flow: land on the org-unit picker / case list.
			this.currentPage = "1";
		}
	};

	@action goHome = () => {
		this.activeModule = "home";
		this.activeFormId = null;
		this.data = null;
		try {
			localStorage.removeItem("mcodtemp");
		} catch (_) {
			/* ignore */
		}
	};

	@action showForm = () => (this.currentPage = "3");
	@action showLang = () => (this.currentPage = "2");
	@action showApi = () => (this.currentPage = "4");
	@action setEngine = (engine: any) => {
		this.engine = engine;
		this.apiStore.setEngine(engine);
	};

	@action edit = () => (this.viewMode = false);
	@action view = () => (this.viewMode = true);
	@action setCurrentEvent = (event: any) => {
		this.currentEvent = event;
		this.actualSelOrgUnit = this.selectedOrgUnit ?? this.actualSelOrgUnit;
		console.log(
			"setting org unit",
			this.currentEventOrgUnit,
			this.actualSelOrgUnit
		);
		this.selectedOrgUnit = this.currentEventOrgUnit;
	};
	@action setNewFromLocalStorage = (ls: any) => {
		this.showForm();
		//TODO: What is this here?
		console.log("lsss", ls);
		if (!!ls["jY3K6Bv4o9Q"])
			ls["jY3K6Bv4o9Q"] = ls["jY3K6Bv4o9Q"] === "true" ? "Yes" : "No";
		this.lsdata = ls;
	};
	@action setSelectedNationality = async (nationality: any) => {
		console.log("Nationality is ", nationality);
		this.selectedNationality = nationality;
	};

	@action setIsIframeEdit = async (isIframeEdit: boolean) => {
		this.isIframeEdit = isIframeEdit;
	};

	@action setSelectedCOD = (causeOfDeath) => {
		this.selectedCauseOfDeath = causeOfDeath;
	};

	@action setSelectedLevel = (level) => {
		this.selectedLevel = level;
	};

	@action fetchAnacodData = async (year) => {
		const url =
			`/api/29/analytics/events/query/vf8dN49jprI.json?` +
			`dimension=pe:${year}` +
			`&dimension=ou:${this.selectedOrgUnit}` +
			"&dimension=aKclf7Yl1PE.ZKBE8Xm9DJG" +
			"&dimension=aKclf7Yl1PE.MOstDqSY0gO" +
			"&dimension=aKclf7Yl1PE.ZYKmQ9GPOaF" +
			"&dimension=aKclf7Yl1PE.Q7VM7swIWb6" +
			"&dimension=aKclf7Yl1PE.QmcOqkcNTip" +
			"&dimension=aKclf7Yl1PE.tuGPnGHWqQn" +
			"&dimension=aKclf7Yl1PE.zwKo51BEayZ" +
			"&dimension=aKclf7Yl1PE.Z41di0TRjIu" +
			"&dimension=aKclf7Yl1PE.dsiwvNQLe5n" +
			"&dimension=aKclf7Yl1PE.RbrUuKFSqkZ" +
			"&dimension=aKclf7Yl1PE.q7e7FOXKnOf" +
			"&dimension=aKclf7Yl1PE.e96GB4CXyd3" +
			"&dimension=aKclf7Yl1PE.i8rrl8YWxLF" +
			"&dimension=aKclf7Yl1PE.sfpqAeqKeyQ" +
			"&dimension=aKclf7Yl1PE.zD0E77W4rFs" +
			"&dimension=aKclf7Yl1PE.cSDJ9kSJkFP" +
			"&dimension=aKclf7Yl1PE.WkXxkKEJLsg" +
			"&dimension=aKclf7Yl1PE.Ylht9kCLSRW" +
			"&dimension=aKclf7Yl1PE.zb7uTuBCPrN" +
			"&dimension=aKclf7Yl1PE.tuMMQsGtE69" +
			"&dimension=aKclf7Yl1PE.uckvenVFnwf" +
			"&dimension=aKclf7Yl1PE.fleGy9CvHYh" +
			"&dimension=aKclf7Yl1PE.myydnkmLfhp" +
			"&dimension=aKclf7Yl1PE.QGFYJK00ES7" +
			"&dimension=aKclf7Yl1PE.C8n6hBilwsX" +
			"&dimension=aKclf7Yl1PE.ZFdJRT3PaUd" +
			"&dimension=aKclf7Yl1PE.hO8No9fHVd2" +
			"&dimension=aKclf7Yl1PE.aC64sB86ThG" +
			"&dimension=aKclf7Yl1PE.CnPGhOcERFF" +
			"&dimension=aKclf7Yl1PE.IeS8V8Yf40N" +
			"&dimension=aKclf7Yl1PE.Op5pSvgHo1M" +
			"&dimension=aKclf7Yl1PE.eCVDO6lt4go" +
			"&dimension=aKclf7Yl1PE.cmZrrHfTxW3" +
			"&dimension=aKclf7Yl1PE.QTKk2Xt8KDu" +
			"&dimension=aKclf7Yl1PE.dTd7txVzhgY" +
			"&dimension=aKclf7Yl1PE.xeE5TQLvucB" +
			"&dimension=aKclf7Yl1PE.ctbKSNV2cg7" +
			"&dimension=aKclf7Yl1PE.mI0UjQioE7E" +
			"&dimension=aKclf7Yl1PE.krhrEBwJeNC" +
			"&dimension=aKclf7Yl1PE.u5ebhwtAmpU" +
			"&dimension=aKclf7Yl1PE.ZKtS7L49Poo" +
			"&dimension=aKclf7Yl1PE.OxJgcwH15L7" +
			"&dimension=aKclf7Yl1PE.fJDDc9mlubU" +
			"&dimension=aKclf7Yl1PE.Zrn8LD3LoKY" +
			"&dimension=aKclf7Yl1PE.z89Wr84V2G6" +
			"&dimension=aKclf7Yl1PE.Kk0hmrJPR90" +
			"&dimension=aKclf7Yl1PE.j5TIQx3gHyF" +
			"&dimension=aKclf7Yl1PE.JhHwdQ337nn" +
			"&dimension=aKclf7Yl1PE.jY3K6Bv4o9Q" +
			"&dimension=aKclf7Yl1PE.UfG52s4YcUt" +
			"&dimension=aKclf7Yl1PE.FhHPxY16vet" +
			"&dimension=aKclf7Yl1PE.KsGOxFyzIs1" +
			"&dimension=aKclf7Yl1PE.b4yPk98om7e" +
			"&dimension=aKclf7Yl1PE.gNM2Yhypydx" +
			"&dimension=aKclf7Yl1PE.tYH7drlbNya" +
			"&dimension=aKclf7Yl1PE.fQWuywOaoN2" +
			"&dimension=aKclf7Yl1PE.wX3i3gkTG4m" +
			"&dimension=aKclf7Yl1PE.xDMX2CJ4Xw3" +
			"&dimension=aKclf7Yl1PE.o1hG9vr0peF" +
			"&dimension=aKclf7Yl1PE.AZSlwlRAFig" +
			"&dimension=aKclf7Yl1PE.U18Tnfz9EKd" +
			"&dimension=aKclf7Yl1PE.DKlOhZJOCrX" +
			"&dimension=aKclf7Yl1PE.kGIDD5xIeLC" +
			"&dimension=aKclf7Yl1PE.V4rE1tsj5Rb" +
			"&dimension=aKclf7Yl1PE.ivnHp4M4hFF" +
			"&dimension=aKclf7Yl1PE.jf9TogeSZpk" +
			"&dimension=aKclf7Yl1PE.xAWYJtQsg8M" +
			"&dimension=aKclf7Yl1PE.lQ1Byr04JTx" +
			"&dimension=aKclf7Yl1PE.DdfDMFW4EJ9" +
			"&dimension=aKclf7Yl1PE.GFVhltTCG8b" +
			"&dimension=aKclf7Yl1PE.KpfvNQSsWIw" +
			"&dimension=aKclf7Yl1PE.AJAraEcfH63" +
			"&dimension=aKclf7Yl1PE.ymyLrfEcYkD" +
			"&dimension=aKclf7Yl1PE.K5BDPJQk1BP" +
			"&dimension=aKclf7Yl1PE.uaxjt0inPNF" +
			"&dimension=aKclf7Yl1PE.Kz29xNOBjsJ" +
			"&dimension=aKclf7Yl1PE.ZXZZfzBpu8a" +
			"&dimension=aKclf7Yl1PE.cp5xzqVU2Vw" +
			"&dimension=aKclf7Yl1PE.lu9BiHPxNqH" +
			"&dimension=aKclf7Yl1PE.PaoRZbokFWJ" +
			"&dimension=aKclf7Yl1PE.twVlVWM3ffz" +
			`&stage=aKclf7Yl1PE&displayProperty=NAME&outputType=EVENT&desc=eventdate&paging=false`;
		// const query1 = {
		// 	events: {
		// 		resource: "events/query.json",
		// 		params: {
		// 			paging: "false",
		// 			programStage: this.programStage,
		// 			totalPages: "true",
		// 			includeAllDataElements: "true",
		// 			// startDate: "2022-01-01",
		// 			// endDate: "2022-12-31",

		// 		},
		// 	},
		// };

		const res = await this.engine.link.fetch(url);
		// turn [id: {name, column}]
		// into {name: id}
		let headers: any = {};
		res.headers.forEach((header, key) => {
			headers[header.name.replace(/^aKclf7Yl1PE./, "")] = key;
		});
		console.log("res", res);
		console.log("headers", headers);

		const result = {};
		const years = [2022, 2023];
		const sexes = [1, 2];

		const pops = anacodpopulation;

		// years.forEach(year => {
		// sexes.forEach(sex => {
		// 	pops.push({ year, sex });
		// });
		// });

		pops.forEach((el) => {
			result[`${el.sex}-${el.year}`] = {
				country_area: "Uganda",
				iso3_code: "UGA",
				data_type: "Population",
				// year: el.year,
				year,
				icd_code: "",
				sex_code: el.sex,
				total_num: el.total_num,
				age_ranges: el.population, // Object.fromEntries(age_ranges.map((age_range) => [age_range, 0])),
			};
		});

		const totals = { "1": 0, "2": 0, "9": 0 };
		for (const row of res.rows) {
			// const country_area = row[headers.country_area];
			// const iso3_code = row[headers.iso3_code];
			const date = row[headers.eventdate];
			const year = !!date ? date.split("-")[0] : "Unknown";
			const icd_code = row[headers.dTd7txVzhgY];
			const sex = row[headers.e96GB4CXyd3].toLowerCase();
			const sex_code = sex == "male" ? 1 : sex == "female" ? 2 : 9;
			const age = row[headers.q7e7FOXKnOf];

			totals[`${sex_code}`]++;

			// create the key for this row based on year, sex, and icd_code
			const key = `${year}-${sex_code}-${icd_code}`;

			// ignore rows that don't have an icd_code
			if (!icd_code) continue;
			// if this is the first time we've seen this key, initialize the object
			if (!result[key]) {
				result[key] = {
					country_area: "Uganda",
					iso3_code: "UGA",
					data_type: "mortality",
					year,
					icd_code,
					sex_code,
					total_num: 0,
					age_ranges: Object.fromEntries(
						age_ranges.map((age_range) => [age_range, 0])
					),
				};
			}

			// update the total_num and age range fields for this row
			if (!!age || age === 0) {
				let ageRange = Math.floor(Math.min(age, 99) / 5) * 5;
				if (ageRange == 0 && age > 0) ageRange = 1;
				result[key].age_ranges[`age_${ageRange}`] += 1;
			} else {
				result[key].age_ranges.age_unknown += 1;
			}
			result[key].total_num += 1;
		}

		for (const item in result) {
			if (result[item].data_type != "Population") break;
			result[item]["total_num"] = totals[result[item]["sex_code"]];
		}

		console.log(result);
		//return result;

		const values = addZZZZ(result);

		pops.forEach((el) => {
			result[`ZZZZ-${el.sex}-${year}`] = {
				country_area: "Uganda",
				iso3_code: "UGA",
				data_type: "mortality",
				year,
				icd_code: "ZZZZ",
				sex_code: el.sex_code,
				total_num: values[el.sex]["total_num"],
				age_ranges: values[el.sex]["age_ranges"],
			};
		});

		let _results = {};
		for (const item in result) {
			if (result[item].data_type !== "Population") continue;
			_results[item] = result[item];
		}
		for (const item in result) {
			if (result[item].icd_code !== "ZZZZ") continue;
			_results[item] = result[item];
		}
		for (const item in result) {
			if (
				result[item].data_type !== "mortality" &&
				result[item].icd_code === "ZZZZ"
			)
				continue;
			_results[item] = result[item];
		}

		return _results;
	};

	@action initApp = async () => {
		try {
			const data = await this.engine.query(initQuery);

			console.log("initApp:", data);

			const doptions = data.options;
			const dprogram = data.program;

			const { id, username, surname, firstName, name } = data.me;

			const user = { id, username, surname, firstName, name };
			this.user = user;

			const options = doptions.optionSets
				.filter((o: any) => {
					return !!o.code;
				})
				.map((optionSet: any) => {
					return [optionSet.code, optionSet.options];
				});
			this.optionSets =
				options.length > 0 ? fromPairs(options) : this.optionSets;

			const units = dprogram.organisationUnits;

			this.programOrganisationUnits = units;
			const programStage = dprogram.programStages[0];

			if (!!this.lsdata) {
				this.fetchLocalStorageEvent();
			}
			console.log("optionsets b4 init", this.optionSets);
			await this.initLanguage(programStage);
		} catch (e) {
			console.log("errrruuuooorrrr", e);
			// this.fetchingOrgUnits = false;
		}
	};

	@action
	loadUserOrgUnits = async () => {
		if (!this.userOrgUnitsLoaded) {
			this.fetchingOrgUnits = true;

			try {
				const data = await this.engine.query(orgQuery);

				console.log("loadUserOrgUnits:", data);

				this.userOrgUnits = data.orgs.organisationUnits.map((o) => ({
					...o,
					pId: o.parent?.id,
				})); //data.me.organisationUnits;
				this.fetchingOrgUnits = false;
				this.userOrgUnitsLoaded = true;
				// console.log("test13", test13);
			} catch (e) {
				console.log("errrruuuooorrrr", e);
				this.fetchingOrgUnits = false;
			}
		}
	};

	@action initLanguage = async (programStage) => {
		if (!!this.activeLanguage?.lang) {
			let al = this.activeLanguage?.lang;

			const url = `/api/dataStore/Languages/${al.LanguageName}`;

			const options = {
				headers: {
					Accept: "application/json; charset=utf-8",
				},
			};

			const result = await this.engine.link
				.fetch(url, options)
				.catch((err: any) => err);

			this.setDataElements(programStage, result.meta.dataElements);
			this.setOptionSets(result.meta.optionSets, result.meta.options);
			this.setNationalitySelect(
				result.meta.categories,
				result.meta.categoryOptions
			);
			console.log(
				"meta",
				result.meta,
				this.optionSets,
				this.nationalitySelect
			);
		}
	};

	@action setNationalitySelect = (categories, categoryOptions) => {
		const langNats = categories?.find((p: any) => p.code == "RT01");
		const langOptions =
			langNats?.categoryOptions?.map((x: any) => x.id) ?? [];
		const langValues = categoryOptions || [];

		let lcategories = [];
		for (let i = 0; i < langOptions.length; i++) {
			const id = langOptions[i];
			lcategories.push(langValues.find((l: any) => l.id == id));
		}

		console.log("cates", lcategories);

		this.nationalitySelect = lcategories || [];
	};

	@action setOptionSets = (optionSets, dataOptions) => {
		optionSets
			.filter((o: any) => {
				return !!o.code;
			})
			.forEach((optionSet: any) => {
				const options = optionSet.options.map((opt) => {
					// Find the matching option from dataOptions
					const dataOption = dataOptions.find((o) => o.id == opt.id);
					// Preserve the original code from the optionSet, use translated name if available
					return {
						...dataOption,
						...opt,
						code: opt.code || dataOption?.code, // Keep the original code, fallback to dataOption if missing
						name: dataOption?.name || opt.name // Use translated name if available
					};
				});
				this.optionSets[optionSet.code] = options;
			});
	};

	@action setDataElements = (programStage, dataElements) => {
		this.availableDataElements = programStage.programStageDataElements.map(
			(de: any) => {
				const trOptions = dataElements.find(
					(dE) => dE.id == de.dataElement.id
				);
				// .forEach((dE: any) => {
				// const options = dE.options.map(opt => result.meta.options.find(o => o.id == opt.id))
				// this.dEs[dE.code] = options;
				// });
				let name = trOptions?.name ?? de.dataElement.name;
				name = name.replace(/^HMIS_100_\s*/, "");
				return {
					...de.dataElement,
					realname: de.dataElement.name,
					name,
					selected: de.displayInReports,
				};
			}
		);
		this.availablePrintDataElements = this.availableDataElements.map((de) => {
			let replace = new RegExp(`^${escapeRegExp(de.code)}\\. ?`);
			de.name = de.name?.replace(replace, "");
			return de;
		});
	};

	@action fetchLocalStorageEvent = async () => {
		if (!!this.lsdata["orgUnit"]) {
			this.actualSelOrgUnit = this.selectedOrgUnit ?? this.actualSelOrgUnit;
			const org = this.programOrganisationUnits.find(
				(o) => o.id === this.lsdata["orgUnit"]
			);
			if (!!org) {
				org.leaf = true;
				this.userOrgUnits = [...this.userOrgUnits, org];
				console.log("setting org unite", org);
				this.selectedOrgUnit = this.lsdata["orgUnit"];
			}
		}

		if (!!this.lsdata["ZKBE8Xm9DJG"]) {
			console.log("ss", this.lsdata["event"]);
			const fillInfo = async () => {
				console.log("fetching by case number", this.lsdata["ZKBE8Xm9DJG"]);
				const e: any = await this.getEventByCase(
					this.lsdata["ZKBE8Xm9DJG"]
				);
				if (!!e) {
					console.log("fetched by case number", e);
					this.currentEventObj = e;
				}
			};
			fillInfo();
		}

		if (!!this.lsdata["event"]) {
			const parent: any = await this.getEvent(this.lsdata["event"]);
			console.log("parant is", parent);
			if (!!parent) {
				this.actualSelOrgUnit = this.selectedOrgUnit ?? this.actualSelOrgUnit;
				const org = this.programOrganisationUnits.find(
					(o) => o.id === parent.orgUnit
				);
				if (!!org) {
					org.leaf = true;
					this.userOrgUnits = [...this.userOrgUnits, org];
					console.log("setting org unite", org);
					this.selectedOrgUnit = parent.orgUnit;
				}
			}
		}

		if (!!this.lsdata["nationality"]) {
			console.log("nationSel", this.nationalitySelect);
			const nId = this.nationalitySelect?.find((n) =>
				this.lsdata["nationality"]
					.toLowerCase()
					.includes(n.shortName.toLowerCase())
			)?.id;
			console.log("setting nat", nId);
			if (!!nId) this.selectedNationality = nId;
		}
	};

	@action getAllLanguages = async (
		languageName?: string,
		language?: any,
		meta?: any
	) => {
		try {
			const url = `/api/dataStore/Languages`;
			const singleLang = (id: any) => `/api/dataStore/Languages/${id}`;

			const options = {
				headers: {
					Accept: "application/json; charset=utf-8",
				},
			};

			const result = await this.engine.link
				.fetch(url, options)
				.catch((err: any) => err);

			if (!result?.length) {
				return [];
			}

			let res: any = [];

			let r;
			for (r = 0; r < result?.length; r++) {
				let newRes = await this.engine.link.fetch(
					singleLang(result[r]),
					options
				);
				res.push(newRes);
			}

			console.log("Result of getting all languages is ", res);
			return res;
		} catch (error) {
			console.log(error);
			return false;
		}
	};

	@action checkAttributesNamespaceExists = async () => {
		const nameSpaceUrl = `/api/dataStore/Attributes`;
		let nameSpaceExists = await this.engine.link
			.fetch(nameSpaceUrl)
			.catch((err: any) => err);

		if (!nameSpaceExists?.length) {
			// Create the name space
			await this.engine.link.fetch(`${nameSpaceUrl}/Attributes`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify([]),
			});

			nameSpaceExists = await this.engine.link
				.fetch(nameSpaceUrl)
				.catch((err: any) => err)?.length;

			this.attributesExist = !!nameSpaceExists;
		}
	};

	@action getSingleLanguage = async (languageName?: string) => {
		try {
			const url = `/api/dataStore/Languages/${languageName}`;
			const options = {
				headers: {
					Accept: "application/json; charset=utf-8",
				},
			};

			const result = await this.engine.link.fetch(url, options);

			return result;
		} catch (error) {
			console.log(error);
			return false;
		}
	};

	@action checkLanguagesExistInDataStore = async () => {
		const nameSpaceUrl = `/api/dataStore/Languages`;
		try {
			const res = await this.engine.link.fetch(nameSpaceUrl);
			return !!res?.length;
		} catch (error) {
			return false;
		}
	};

	@action saveNewLang = async (
		languageName?: string,
		language?: any,
		meta?: any
	) => {
		try {
			const nameSpaceUrl = `/api/dataStore/Languages`;
			const url = `${nameSpaceUrl}/${languageName}`;

			console.log("Saving new language", languageName);

			const postObject = JSON.stringify({
				language,
				meta,
			});

			let nameSpaceExists = await this.checkLanguagesExistInDataStore();

			if (!nameSpaceExists) {
				// Create the name space
				await this.engine.link.fetch(`${nameSpaceUrl}/placeholder`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({}),
				});

				// nameSpaceExists = await checkLanguagesExistInDataStore();
			}

			const result = await this.engine.link.fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					// 'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: postObject,
			});

			return result;
		} catch (error) {
			console.log(error);
			return false;
		}
	};

	@action saveActiveLanguage = async (
		langName?: string,
		language?: any,
		ICDLang?: string,
		isUpdate?: boolean
	) => {
		console.log(
			"\n\n",
			"Result of getting ActiveLanguage language is ",
			false,
			"\n\n"
		);
		try {
			const url = `/api/dataStore/ActiveLanguage/ActiveLanguage`;
			const postObject = JSON.stringify({
				language,
				ICDLang,
			});

			console.log("Post object for active lang is ", postObject);

			const result = await this.engine.link.fetch(url, {
				method: isUpdate ? "PUT" : "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: postObject,
			});

			// const result = await this.engine.link.fetch(url);
			console.log("\n\nResult is ", result);

			return result;
		} catch (error) {
			console.log("\n\nResult is ", error);
			console.log(error);
			return false;
		}
	};

	@action postLanguageMeta = async (meta?: any) => {
		try {
			const updateUrl = "/api/29/metadata";
			const postUrl =
				"/api/metadata.json?importMode=COMMIT&identifier=UID&importReportMode=ERRORS&preheatMode=REFERENCE&importStrategy=CREATE_AND_UPDATE&atomicMode=ALL&mergeMode=MERGE&flushMode=AUTO&skipSharing=true&skipValidation=true&async=true&inclusionStrategy=NON_NULL&format=json";

			const data = await this.engine.query(initQuery);
			const metaExists = !!data.program.programStages[0];
			let url = metaExists ? updateUrl : postUrl;

			const slimMeta = _.pick(meta, [
				"dataElements",
				"categoryOptions",
				"categoryOptionCombos",
				"categories",
				"optionSets",
				"options",
			]);

			const postObject = JSON.stringify(slimMeta);
			console.log("Meta object is ", postObject);

			const result = await this.engine.link.fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					// 'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: postObject,
			});
			console.log("Result of posting new meta is ", result);
			return result;
		} catch (error) {
			console.log(error);
			return false;
		}
	};

	@action getActiveLanguage = async (defaultLang?: any) => {
		try {
			const url = `/api/dataStore/ActiveLanguage/ActiveLanguage`;
			const options = {
				headers: {
					Accept: "application/json; charset=utf-8",
				},
			};

			const result = await this.engine.link.fetch(url, options);
			return result;
		} catch (error) {
			console.log(error);
			return false;
		}
	};

	@action getICDLanguage = async (defaultLang?: any) => {
		try {
			const url = `/api/dataStore/ActiveLanguage/ICDLanguage`;

			const result = await this.engine.link.fetch(url);
			return result;
		} catch (error) {
			console.log(error);
			return false;
		}
	};

	@action checkIfAdmin = async () => {
		try {
			const userDetails = await this.engine.query({
				me: {
					resource: "me.json",
					params: {
						fields: "userCredentials[userRoles]",
					},
				},
			});
			console.log("check if admin Result is ", userDetails?.me.code);
			const roles = userDetails?.me?.userCredentials?.userRoles;
			this.roles = roles;
			return roles?.some((r) => r.id === "yrB6vc5Ip3r");
		} catch (e) {
			console.log(e);
			return false;
		}
	};

	@action getRegions = async () => {
		try {
			const url =
				"/api/organisationUnits.json?level=2&paging=false&fields=id,displayName,children[id,displayName,children[id,displayName]]";

			// Get the list regions, districts and sub counties
			const result = await this.engine.link.fetch(url);

			console.log("Result of district fetch is ", result);
			return result;
		} catch (error) {
			console.log(error);
			return false;
		}
	};

	@action getFacilities = async () => {
		try {
			const url =
				"/api/organisationUnits.json?level=5&paging=false&fields=id,displayName";

			// Get the list of all facilities (level 5)
			const result = await this.engine.link.fetch(url);

			console.log("Result of facilities fetch is ", result);
			return result;
		} catch (error) {
			console.log(error);
			return false;
		}
	};

	@action setActiveLanguage = (lang: any) => {
		this.activeLanguage = lang;
	};

	@action setICDLang = (lang: any) => {
		this.ICDLang = lang;
	};

	@action checkProgramExists = async () => {
		if (this.programExists) return true;

		const programData = await this.engine.query({
			programs: {
				resource: "programs",
				params: {
					fields: ["id", "name"],
				},
			},
		});

		this.programExists = programData.programs.programs.some(
			(p: any) => p.id == this.program
		);
		this.programExists = programData.programs.programs.some(
			(p: any) => p.id == this.program
		);
		return this.programExists;
	};

	@action createProgram = async () => {
		const metaUrl = `/api/metadata`;
		return await this.engine.link.fetch(metaUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...extraHeaders,
			},
			body: JSON.stringify(englishMeta),
		});
	};

	@action
	isUserApproved = async () => {
		// const query =
		try {
			let canApprove = false;

			// Get the logged in users data
			//   const data = await this.engine.query(query);
			const userName = this.user.name;

			// Get the list of authorized users
			const result = await this.engine.link.fetch(
				"/api/userGroups/nZNrVoI1MSU.json?fields=users[id, name]"
			);

			// Check if the logged in user exists in the list of authorized users
			const users = result.users;
			if (users && isArray(users)) {
				const matchingUser = users.find((item) => item.name === userName);
				if (matchingUser) canApprove = true;
			}

			// If the user exists in the list of authorized users they are approved
			return {
				canApprove,
				userName,
			};
		} catch (e) {
			console.log(e);
			return {
				canApprove: false,
				userName: "",
			};
		}
	};

	@action disableForm = async () => {
		try {
			this.forceDisable = true;
		} catch (e) {
			console.log(e);
		}
	};

	@action enableForm = async () => {
		try {
			this.forceDisable = false;
		} catch (e) {
			console.log(e);
		}
	};

	@action
	loadOrganisationUnitsChildren = async (parent: string) => {
		const query = {
			organisations: {
				resource: `organisationUnits.json`,
				params: {
					filter: `id:in:[${parent}]`,
					paging: "false",
					fields: "children[id,name,path,leaf]",
				},
			},
		};
		try {
			const data = await this.engine.query(query);
			console.log("otdddx res", data.organisations);
			const found = data.organisations.organisationUnits.map((unit: any) => {
				return unit.children.map((child: any) => {
					return { ...child, pId: parent };
				});
			});
			const all = flatten(found);
			console.log("otdddx userorgs", this.userOrgUnits);
			console.log("otdddx flatt", all);
			this.userOrgUnits = [...this.userOrgUnits, ...all];
		} catch (e) {
			console.log(e);
		}
	};

	@action setSelectedOrgUnit = async (val: any) => {
		this.selectedOrgUnit = val;
	};

	@action changeSelectedDateRange = async (
		start: string,
		end: string,
		prev: string
	) => {
		this.selectedDateRange = [start, end, prev];
	};

	@action clearSelectedDateRange = async () => {
		this.selectedDateRange = null;
	};

	@action changeSelectedDlDateRange = async (start: string, end: string) => {
		this.selectedDlDateRange = [start, end];
	};

	@action clearSelectedDlDateRange = async () => {
		this.selectedDlDateRange = null;
	};

	@action fetchIndis = async () => {
		const currOrgLevel = this.getCurrentOrgUnitLevel();
		const level = (Number(currOrgLevel) || 0) + 1;
		const url = `https://hmis.health.go.ug/api/37/analytics?dimension=pe:202305,ou:LEVEL-${level},dx:vyOajQA5xTu;T8W0wbzErSF&displayProperty=NAME&includeNumDen=true&skipMeta=true&skipData=false`;
		const creds = {
			username: "moh-rch.dmurokora",
			password: "Dhis@2022",
		};

		// const credentials = btoa(`${creds.username}:${creds.password}`);
		// const res = await fetch(url, {
		// 	headers: { "Authorization": `Basic ${credentials}` }
		// }).then((res) => res.json())
		// .catch((err) => console.log("err", err));
		const res = analyticsjson;

		console.log("res fetch indis", res);
		const headers = getHeaders(res.headers);
		const dxkey = headers.find((h: any) => h.name === "dx")?.index;
		const oukey = headers.find((h: any) => h.name === "ou")?.index;
		const pekey = headers.find((h: any) => h.name === "pe")?.index;
		const valuekey = headers.find((h: any) => h.name === "value")?.index;
		const obj = {};
		res.rows.forEach((row: any, index: number) => {
			const _oukey = row[oukey];
			const _dxkey = row[dxkey];
			const oulevel = Math.min(parseInt(this.getOrgUnitLevel(_oukey), 0));
			if (oulevel == currOrgLevel + 1) {
				if (!obj[_oukey]) obj[_oukey] = {};
				obj[_oukey][_dxkey] = row[valuekey];
			}
		});
		console.log("obj", obj);
		this.allIndis = obj;
	};

	// whole thing is a mess
	@action queryTopEvents = async () => {
		this.loadingTopDiseases = true;
		this.totalCauseDeathCount = 0;
		this.totalDeathCount = 0;
		const filterByCause = this.selectedCauseOfDeath;

		try {
			let data = null;
			let prevData = null;

			if (!!this.selectedNationality) {
				const query1 = {
					events: {
						resource: "events/query.json",
						params: {
							paging: "false",
							programStage: this.programStage,
							...(this.selectedOrgUnit && {
								orgUnit: this.selectedOrgUnit,
								ouMode: "DESCENDANTS",
							}),
							totalPages: "true",
							attributeCc: this.attributeCC,
							attributeCos: this.selectedNationality,
							includeAllDataElements: "true",
							order: this.sorter,
							...(this.selectedDateRange && {
								startDate: this.selectedDateRange[0],
								endDate: this.selectedDateRange[1],
							}),
						},
					},
				};

				const res = await this.engine.query(query1);
				data = res.events;
				this.allDeaths = data.rows.map((item: any) => {
					const headers = getHeaders(data.headers);
					return headers.map((header: any) => {
						return { [header.name]: item[header.index] };
					});
				});

				if (!!this.selectedDateRange) {
					// let query2 = Object.assign({}, query1);
					// query2.events.params.startDate = this.selectedDateRange[2];
					// query2.events.params.endDate = this.selectedDateRange[0];
					const query2 = {
						events: {
							resource: "events/query.json",
							params: {
								paging: "false",
								programStage: this.programStage,
								...(this.selectedOrgUnit && {
									orgUnit: this.selectedOrgUnit,
									ouMode: "DESCENDANTS",
								}),
								totalPages: "true",
								attributeCc: this.attributeCC,
								attributeCos: this.selectedNationality,
								includeAllDataElements: "true",
								order: this.sorter,
								...(this.selectedDateRange && {
									startDate: this.selectedDateRange[2],
									endDate: this.selectedDateRange[0],
								}),
							},
						},
					};
					const res2 = await this.engine.query(query2);

					prevData = res2.events;
				}
			} else {
				let query1 = {};
				let query2 = {};

				console.log(this.selectedDateRange);

				for (let i = 0; i < this.nationalitySelect?.length; i++) {
					const id = this.nationalitySelect[i].id;
					query1[`event_${id}`] = {
						resource: "events/query.json",
						params: {
							paging: "false",
							programStage: this.programStage,
							...(this.selectedOrgUnit && {
								orgUnit: this.selectedOrgUnit,
								ouMode: "DESCENDANTS",
							}),
							totalPages: "true",
							attributeCc: this.attributeCC,
							attributeCos: id,
							includeAllDataElements: "true",
							order: this.sorter,
							...(this.selectedDateRange && {
								startDate: this.selectedDateRange[0],
								endDate: this.selectedDateRange[1],
							}),
						},
					};

					if (!!this.selectedDateRange) {
						// query2[`event_${id}`] = Object.assign({}, query1[`event_${id}`]);
						// query2[`event_${id}`].params.startDate = this.selectedDateRange[2];
						// query2[`event_${id}`].params.endDate = this.selectedDateRange[0];
						query2[`event_${id}`] = {
							resource: "events/query.json",
							params: {
								paging: "false",
								programStage: this.programStage,
								...(this.selectedOrgUnit && {
									orgUnit: this.selectedOrgUnit,
									ouMode: "DESCENDANTS",
								}),
								totalPages: "true",
								attributeCc: this.attributeCC,
								attributeCos: id,
								includeAllDataElements: "true",
								order: this.sorter,
								...(this.selectedDateRange && {
									startDate: this.selectedDateRange[2],
									endDate: this.selectedDateRange[0],
								}),
							},
						};
					}
				}

				console.log("Query", query1);
				const res = await this.engine.query(query1);
				console.log("Result", res);
				for (let i = 0; i < this.nationalitySelect?.length; i++) {
					const id = this.nationalitySelect[i].id;
					if (i == 0) {
						data = res[`event_${id}`];
					} else {
						data.rows?.concat(res[`event_${id}`].rows);
					}
				}

				if (!!this.selectedDateRange) {
					console.log("Query2", query2);
					const res2 = await this.engine.query(query2);
					console.log("Result2", res2);
					for (let i = 0; i < this.nationalitySelect?.length; i++) {
						const id = this.nationalitySelect[i].id;
						if (i == 0) {
							prevData = res2[`event_${id}`];
						} else {
							prevData.rows?.concat(res2[`event_${id}`].rows);
						}
					}
				}
			}

			// current organisation will be empty if org unit is not a facility
			// so we fetch the current orgUnits children
			// and use those for top deaths by child orgs
			let groupedOrgs = [];
			let keyedOrgs = {};

			console.log("currentOrganisation", this.currentOrganisation);

			if (
				!!this.selectedLevel ||
				(!this.currentOrganisation && !!this.selectedOrgUnit)
			) {
				let allOrgs = [];
				let filterOrgs = [];

				if (!!this.selectedLevel) {
					if (!this.allOrgUnits) {
						const query5 = {
							organisations: {
								resource: `organisationUnits.json`,
								params: {
									paging: "false",
									fields: "id,name,children,level",
								},
							},
						};

						const resOrgs = await this.engine.query(query5);
						this.allOrgUnits = resOrgs.organisations.organisationUnits;
					}

					allOrgs = this.allOrgUnits.filter(
						(org) => org.level >= this.selectedLevel
					);
					filterOrgs = this.allOrgUnits.filter(
						(org) => org.level == this.selectedLevel
					);
				} else {
					const query5 = {
						organisations: {
							resource: `organisationUnits/${this.selectedOrgUnit}.json`,
							params: {
								paging: "false",
								fields: "id,name,children,level",
								includeDescendants: "true",
							},
						},
					};

					const resOrgs = await this.engine.query(query5);
					allOrgs = resOrgs.organisations.organisationUnits;
					filterOrgs = [
						allOrgs.find((org) => org.id == this.selectedOrgUnit),
					];
				}

				keyedOrgs = _.keyBy(allOrgs, "id");

				const getAllChildren = (orgUnit: any) => {
					return keyedOrgs[orgUnit].children.flatMap((org) => {
						return [org.id, ...getAllChildren(org.id)];
					});
				};

				groupedOrgs = filterOrgs.map((org) => {
					return {
						id: org.id,
						name: keyedOrgs[org.id]?.name,
						children: getAllChildren(org.id),
					};
				});
				//this.diseaseOrgUnits = groupedOrgs;
			}

			const getParentOrg = (orgUnit: any) => {
				// if (orgUnit == this.selectedOrgUnit) {
				//   return null;
				// }
				let parentOrg = groupedOrgs.find(
					(org) => org.id == orgUnit || org.children.includes(orgUnit)
				);
				if (
					!parentOrg &&
					!this.currentOrganisation &&
					!!this.selectedOrgUnit
				)
					console.log(orgUnit);
				return parentOrg;
			};

			let diseases: any = {};
			let prevDiseases: any = {};
			let orgDiseases: any = {};
			let prevOrgDiseases: any = {};

			console.log("data", data);
			this.allDeaths = data?.rows.map((item: any) => {
				const headers = getHeaders(data.headers);
				const obj = {};
				headers.forEach((header: any) => {
					obj[header.name] = item[header.index];
				});
				obj["dOrgUnitName"] = this.getOrgUnitName(obj["orgUnit"]);
				obj["dOrgUnitLevels"] = this.getOrgUnitLevels(obj["orgUnit"]);
				obj["cOrgUnit"] = getParentOrg(obj["orgUnit"]);

				return obj;
			});

			if (!!prevData) {
				const { headers, rows } = prevData;
				const {
					codIndex,
					causeOfDeathIndex,
					birthIndex,
					deathIndex,
					sexIndex,
					orgUnitIndex,
				} = getHeaderIndexes(headers);

				for (var i = 0; i < prevData.rows.length; i++) {
					const name: string = rows[i][codIndex];
					const code: string = rows[i][causeOfDeathIndex];
					const dob: string = rows[i][birthIndex];
					const dod: string = rows[i][deathIndex];
					const gender: string = rows[i][sexIndex];
					const orgUnit: string = rows[i][orgUnitIndex];
					const parentOrg = getParentOrg(orgUnit);

					const org = { id: parentOrg?.id, name: parentOrg?.name };

					if (!prevDiseases[name])
						prevDiseases[name] = {
							name,
							code,
							count: 0,
							affected: [],
						};
					prevDiseases[name].count += 1;
					prevDiseases[name].affected.push({ dob, dod, gender, org });

					if (!parentOrg) continue;
					if (!prevOrgDiseases[parentOrg?.id])
						prevOrgDiseases[parentOrg?.id] = {};
					if (!prevOrgDiseases[parentOrg?.id][name]) {
						prevOrgDiseases[parentOrg?.id][name] = 0;
					}
					prevOrgDiseases[parentOrg?.id][name] += 1;
				}

				if (!!filterByCause) {
					const f = new CauseOfDeathFilter();
					prevDiseases = f.apply(prevDiseases, filterByCause);
				}
				this.prevDiseases = prevDiseases;
				this.prevDiseaseOrgUnits = prevOrgDiseases;
			}

			if (!!data) {
				const { headers, rows } = data;
				const {
					codIndex,
					causeOfDeathIndex,
					birthIndex,
					deathIndex,
					sexIndex,
					orgUnitIndex,
				} = getHeaderIndexes(headers);

				for (var i = 0; i < rows.length; i++) {
					const name: string = rows[i][codIndex];
					const code: string = rows[i][causeOfDeathIndex];
					const dob: string = rows[i][birthIndex];
					const dod: string = rows[i][deathIndex];
					const gender: string = rows[i][sexIndex];
					const orgUnit: string = rows[i][orgUnitIndex];
					const parentOrg = getParentOrg(orgUnit);

					const org = { id: parentOrg?.id, name: parentOrg?.name };

					if (!diseases[name]) {
						diseases[name] = {
							name,
							code,
							affected: [],
							count: 0,
							prev: prevDiseases[name] ?? 0,
						};
					}

					diseases[name].count += 1;
					diseases[name].affected.push({ dob, dod, gender, org });

					if (!parentOrg) continue;
					if (!orgDiseases[parentOrg?.id]) orgDiseases[parentOrg?.id] = {};
					if (!orgDiseases[parentOrg?.id][name]) {
						orgDiseases[parentOrg?.id][name] = 0;
					}
					orgDiseases[parentOrg?.id][name] += 1;
				}
				this.totalDeathCount = rows.length;
			}

			// console.log("prevDiseases", prevDiseases);

			let totalCauseDeathCount = 0;
			if (!!filterByCause) {
				// console.log("---------------------------------");
				const f = new CauseOfDeathFilter();
				diseases = f.apply(diseases, filterByCause);
				Object.keys(diseases).forEach(
					(k) => (totalCauseDeathCount += diseases[k].count)
				);
			}

			this.totalCauseDeathCount = totalCauseDeathCount;
			this.allDiseases = diseases;
			// console.log("allDiseases", this.allDiseases);
			// console.log("causeOfDeath", filterByCause);
			// console.log("this.totalCauseDeathCount", this.totalCauseDeathCount);
			// console.log("totalCauseDeathCount", totalCauseDeathCount);

			this.topDiseases = Object.values(diseases)
				?.sort((a: any, b: any) => a.count - b.count)
				?.slice(-20);

			console.log("topDiseases", this.topDiseases);
			this.loadingTopDiseases = false;
		} catch (e) {
			console.log(e);
			this.topDiseases = [];
			this.loadingTopDiseases = false;
		}
	};

	@action getEventByCase = async (casenumber) => {
		let query1: any = {
			events: {
				resource: `events.json`,
				params: {
					program: this.program,
					programStage: this.programStage,
					filter: `ZKBE8Xm9DJG:in:${casenumber}`,
				},
			},
		};

		try {
			console.log("case number query", query1);
			const data = await this.engine.query(query1);
			console.log("case number daya", data);
			return !!data.events ? data.events.events[0] : null;
			// runInAction(() => {
			// 	this.data = data.events;

			// 	this.data.headers = this.data.headers.map(
			// 		(a: any, i: number) => {
			// 			return {
			// 				...a,
			// 				i,
			// 			};
			// 		}
			// 	);
			// 	this.total = this.data.metaData.pager.total;
			// });
		} catch (e) {
			console.log("exxx", e);
		}
	};

	getEventByNIN = async (nin) => {
		let query1: any = {
			events: {
				resource: `events.json`,
				params: {
					program: this.program,
					programStage: this.programStage,
					filter: `MOstDqSY0gO:in:${nin}`,
				},
			},
		};

		try {
			const data = await this.engine.query(query1);
			console.log("nin data", data);
			return !!data.events ? data.events.events[0] : null;
		} catch (e) {
			console.log("error", e);
		}
	};

	@action getEventByInpatientNo = async (inpatientno) => {
		let query1: any = {
			events: {
				resource: `events.json`,
				params: {
					program: this.program,
					programStage: this.programStage,
					filter: `FGagV1Utrdh:in:${inpatientno}`,
				},
			},
		};

		try {
			console.log("inpatient number", query1);
			const data = await this.engine.query(query1);
			console.log("inpatient number", data);
			return !!data.events ? data.events.events[0] : null;
		} catch (e) {
			console.log("exxx", e);
		}
	};

	@action getEvent = async (eventId) => {
		let query1: any = {
			event: {
				resource: `events/${eventId}.json`,
			},
		};

		try {
			console.log("q11", query1);
			const data = await this.engine.query(query1);
			console.log({ data });
			return data.event;
			// runInAction(() => {
			// 	this.data = data.events;

			// 	this.data.headers = this.data.headers.map(
			// 		(a: any, i: number) => {
			// 			return {
			// 				...a,
			// 				i,
			// 			};
			// 		}
			// 	);
			// 	this.total = this.data.metaData.pager.total;
			// });
		} catch (e) {
			console.log("exxx", e);
		}
	};

	@action clearEventList = () => {
		if (!!this.data) this.data = [];
	};

	@action queryEvents = async () => {
		console.log("canFetch", this.canFetchData);
		if (this.canFetchData) {
			let query1: any = {
				events: {
					resource: "tracker/events",
					params: {
						page: this.page,
						pageSize: this.pageSize,
						programStage: this.programStage,
						orgUnit: this.selectedOrgUnit,
						ouMode: "DESCENDANTS",
						totalPages: "true",
						attributeCc: this.attributeCC,
						attributeCos: this.selectedNationality,
						includeAllDataElements: "true",
						...(this.selectedDlDateRange && {
							startDate: this.selectedDlDateRange[0],
							endDate: this.selectedDlDateRange[1],
						}),
						// query: this.search === "" ? "" : `LIKE:${this.search}`,
					},
				},
			};

			if (!!this.filters) {
				query1.events.params["filter"] = [];
				Object.keys(this.filters).forEach((key) => {
					if (!!this.filters[key]?.value)
						query1.events.params.filter.push(
							`${key}:LIKE:${this.filters[key].value}`
						);
				});
			}

			try {
				const data = await this.engine.query(query1);
				console.log(query1, data);

				runInAction(() => {
					this.data = data.events.events;

					// this.data.headers = this.data.headers.map((a: any, i: number) => {
					//   return {
					//     ...a,
					//     i,
					//   };
					// });
					this.total = data.events.total ?? this.data.length;
					console.log("total", this.total);
				});
			} catch (e) {
				console.log(e);
			}
		}
	};

	@action downloadData = async (allorgs = false) => {
		if (this.canFetchData) {
			let query1: any = {
				events: {
					resource: "events/query.json",
					params: {
						paging: "false",
						programStage: this.programStage,
						...(allorgs
							? {}
							: {
								orgUnit: this.selectedOrgUnit,
								ouMode: "DESCENDANTS",
							}),
						totalPages: "true",
						attributeCc: this.attributeCC,
						attributeCos: this.selectedNationality,
						includeAllDataElements: "true",
						order: this.sorter,
						...(this.selectedDlDateRange && {
							startDate: this.selectedDlDateRange[0],
							endDate: this.selectedDlDateRange[1],
						}),
						// query: this.search === "" ? "" : `LIKE:${this.search}`,
					},
				},
			};

			if (!!this.filters) {
				query1.events.params["filter"] = [];
				Object.keys(this.filters).forEach((key) => {
					if (!!this.filters[key]?.value)
						query1.events.params.filter.push(
							`${key}:LIKE:${this.filters[key].value}`
						);
				});
			}

			console.log(query1);

			try {
				const data = await this.engine.query(query1);

				let dd = [];
				let headerIndexes = [];

				let dodIndex = null;

				const columns = this.getdlcolumns(data.events);
				console.log("dlcolumns", columns);
				let headers = [];
				columns.forEach((c, idx) => {
					if (c.key === "i8rrl8YWxLF") {
						dodIndex = data.events.headers.findIndex(
							(eh) => eh.name === "i8rrl8YWxLF"
						);
						headers.push("100-DDO10. Date of Death");
						headers.push("100-DDO10. Time of Death");
					} else {
						headers.push(c.title);
					}
				});
				// headers.push("Nationality");
				dd.push(headers);

				columns.forEach((h, idx) => {
					const hidx = data.events.headers.findIndex(
						(eh) => eh.name === h.key
					);
					headerIndexes.push(hidx);
				});

				data.events.rows.forEach((e) => {
					const rowdata = [];
					headerIndexes.forEach((idx) => {
						if (!!dodIndex && dodIndex === idx) {
							rowdata.push(moment(e[idx]).format("YYYY-MM-DD"));
							rowdata.push(moment(e[idx]).format("HH:mm:ss"));
						} else {
							rowdata.push(e[idx]);
						}
					});

					dd.push(rowdata);
				});

				console.log("Download data", dd);
				return dd;
			} catch (e) {
				console.log(e);
			}
		}
	};

	@action handleChange = async (
		pagination: any,
		filters: any,
		sorter: any
	) => {
		const order =
			sorter.field && sorter.order
				? `${sorter.field}:${sorter.order === "ascend" ? "asc" : "desc"}`
				: "created:desc";
		const page =
			pagination.pageSize !== this.pageSize || order !== this.sorter
				? 1
				: pagination.current;
		this.sorter = order;
		this.page = page;
		this.pageSize = pagination.pageSize;

		try {
			await this.queryEvents();
		} catch (error) {
			console.error("Failed to fetch projects", error);
		}
	};

	@action addEvent = async (form: any) => {
		let { eventDate, dateOfNotification, ...rest } = form;
		// let eventDate;
		// const { ...rest } = form;

		console.log("FORM RECEIVED IS ", form);
		const dataValues = Object.entries(rest)
			.map(([dataElement, value]) => {
				if (value instanceof moment) {
					if (dataElement === "i8rrl8YWxLF") {
						value = moment(value).format("YYYY-MM-DDTHH:mm:ss.SSSZ");
						eventDate = value;
					} else {
						value = moment(value).format("YYYY-MM-DD");
					}
				}
				return {
					dataElement,
					value,
				};
			})
			.filter((dv) => !!dv.value || dv.value === 0);

		// If eventDate is not set by i8rrl8YWxLF, fallback to the original eventDate if present
		// if (!eventDate && form.eventDate) {
		// 	eventDate = moment(form.eventDate).format("YYYY-MM-DD");
		// }

		console.log("OBJECT ENTRIES ARE:", dataValues);
		let event: any = {
			attributeCategoryOptions: this.selectedNationality || "l4UMmqvSBe5",
			orgUnit: this.selectedOrgUnit,
			program: this.program,
			programStage: this.programStage,
			eventDate: eventDate || moment(eventDate).format("YYYY-MM-DD"),
			event: "",
			dataValues,
		};

		// Find the data element object with ID "ZKBE8Xm9DJG"
		let zkbe8xValue = event.dataValues.find(element => element.dataElement === "ZKBE8Xm9DJG");

		// If the data element object is found, set the value of the "event" field to match it
		if (zkbe8xValue) {
			let value = zkbe8xValue.value;

			if (value.includes("MATERNAL") || value.includes("PERI")) {
				// Slice the value to use the last 11 digits
				event.event = value.slice(-11);
			} else {
				// Use the original value
				event.event = value;
			}
		}

		const under = {
			field1: "",
		};

		let createMutation: any = {
			type: "create",
			resource: "events",
			data: event,
		};
		console.log(
			"vvv",
			this.currentEvent,
			this.editing,
			JSON.stringify(this.lsdata)
		);

		let evt = null;
		if (this.editing && this.currentEvent) {
			event = { ...event, event: this.currentEvent.event };
			createMutation = { ...createMutation, data: event };
		} else if (!!this.currentEventObj || this.lsdata?.setevent) {
			evt = this.currentEventObj?.event ?? this.lsdata?.setevent;
			event = { ...event, event: evt };
			console.log("saving evt", evt);
			createMutation = { ...createMutation, data: event };
		}

		// if (!!form["MOstDqSY0gO"]) {
		// 	const found = await this.getEventByNIN(form["MOstDqSY0gO"]);
		// 	if (!!found && evt !== found.event) {
		// 		notification.error({
		// 			message: "Failed to save MCCOD Record",
		// 			description: "An event with the same NIN was already recorded.",
		// 			duration: 4,
		// 		});
		// 		this.selectedOrgUnit = this.actualSelOrgUnit;
		// 		return;
		// 	}
		// }
		// if (!!form["ZKBE8Xm9DJG"]) {
		// 	const found = await this.getEventByCase(form["ZKBE8Xm9DJG"]);
		// 	if (!!found && evt !== found.event) {
		// 		notification.error({
		// 			message: "Failed to save MCCOD Record",
		// 			description:
		// 				"An event with the same Case number was already recorded.",
		// 			duration: 4,
		// 		});
		// 		this.selectedOrgUnit = this.actualSelOrgUnit;
		// 		return;
		// 	}
		// }
		// if (!!form["FGagV1Utrdh"]) {
		// 	const found = await this.getEventByInpatientNo(form["FGagV1Utrdh"]);
		// 	if (!!found && evt !== found.event) {
		// 		notification.error({
		// 			message: "Failed to save MCCOD Record",
		// 			description:
		// 				"An event with the same Inpatient number was already recorded.",
		// 			duration: 4,
		// 		});
		// 		this.selectedOrgUnit = this.actualSelOrgUnit;
		// 		return;
		// 	}
		// }

		// if (!!form["ZKBE8Xm9DJG"]) {
		// 	const found = await this.getEventByCase(form["ZKBE8Xm9DJG"]);
		// 	if (!!found && evt !== found.event) {
		// 		const userConfirmed = window.confirm(
		// 			"An event with the same Case number was already recorded. Do you want to proceed?"
		// 		);
		//
		// 		if (!userConfirmed) {
		// 			notification.error({
		// 				message: "Failed to save MCCOD Record",
		// 				description:
		// 					"An event with the same Case number was already recorded.",
		// 				duration: 4,
		// 			});
		// 			this.selectedOrgUnit = this.actualSelOrgUnit;
		// 			return;
		// 		}
		// 	}
		// }
		//


		if (!!form["ZKBE8Xm9DJG"] || !!form["FGagV1Utrdh"] || !!form["MOstDqSY0gO"]) {
			let errorMessage = "";

			if (!!form["ZKBE8Xm9DJG"]) {
				const foundCase = await this.getEventByCase(form["ZKBE8Xm9DJG"]);
				if (!!foundCase && evt !== foundCase.event) {
					errorMessage += "An event with the same Case number was already recorded.\n";
				}
			}

			if (!!form["FGagV1Utrdh"]) {
				const foundInpatient = await this.getEventByInpatientNo(form["FGagV1Utrdh"]);
				if (!!foundInpatient && evt !== foundInpatient.event) {
					errorMessage += "An event with the same Inpatient number was already recorded.\n";
				}
			}

			if (!!form["MOstDqSY0gO"]) {
				const foundNIN = await this.getEventByNIN(form["MOstDqSY0gO"]);
				if (!!foundNIN && evt !== foundNIN.event) {
					errorMessage += "An event with the same NIN was already recorded.\n";
				}
			}

			if (errorMessage) {
				const userConfirmed = window.confirm(
					`${errorMessage}Do you want to proceed?`
				);

				if (!userConfirmed) {
					notification.error({
						message: "Failed to save MCCOD Record",
						description:
							"An event with the same Case number was already recorded.",
						duration: 4,
					});
					this.selectedOrgUnit = this.actualSelOrgUnit;
					return;
				}
			}
		}

		try {
			console.log("muation", createMutation);
			await this.engine.mutate(createMutation);

			notification.success({
				message: "MCCOD record saved successfully!",
				// description: "Your translation passed all validation checks!",
				onClick: () => { },
				duration: 3,
			});

			this.selectedOrgUnit = this.actualSelOrgUnit;
			this.queryEvents();
		} catch (error) {
			console.error("Failed to fetch projects", error);

			// Adding a fail message notification
			notification.error({
				message: "Failed to save MCCOD record",
				onClick: () => { },
				duration: 3,
			});
		}
		this.selectedOrgUnit = this.actualSelOrgUnit;
		this.showEvents();
	};

	@action deleteEvent = async (eventId = null) => {
		const eid = eventId ?? this.currentEvent;
		try {
			if (eid) {
				const createMutation = {
					type: "delete",
					resource: "events",
					id: eid,
				};
				await this.engine.mutate(createMutation);
				this.showEvents();
			}
		} catch (e) {
			console.log(e);
		}
	};

	@action setInitialFilters = () => {
		let filters = {};
		console.log("COLS", this.columns);
		this.columns.slice(0, 4).forEach((c) => {
			filters[c.key] = {
				value: "",
				title: c.title,
			};
		});
		// Always include Inpatient Number as an explicit searchable filter
		filters["FGagV1Utrdh"] = {
			value: "",
			title: "Inpatient No.",
		};
		console.log({ filters });
		this.filters = filters;
	};

	@action causeOfDeathAltSearch = (e: any) => {
		try {
			const DOBA = e;
			console.log(DOBA);
		} catch (e) {
			console.log(e);
		}
		return e;
	};

	@action editEvent = () => {
		this.editing = true;
		this.edit();
		this.showForm();
	};

	@action setAvailableDataElements = (val: any) => {
		this.availableDataElements = val;
	};

	@action includeColumns = (id: any) => (e: any) => {
		const elements = this.availableDataElements.map((col: any) => {
			if (col.id === id) {
				return { ...col, selected: e.target.checked };
			}
			return col;
		});
		this.setAvailableDataElements(elements);
	};

	@action setAvailablePrintDataElements = (val: any) => {
		this.availablePrintDataElements = val;
	};

	@action includePrintColumns = (id: any) => (e: any) => {
		const elements = this.availablePrintDataElements.map((col: any) => {
			if (col.id === id) {
				return { ...col, selected: e.target.checked };
			}
			return col;
		});
		this.setAvailablePrintDataElements(elements);
	};

	@action changeDisable = (key: string, value: boolean) => {
		this.allDisabled = { ...this.allDisabled, [key]: value };
	};

	@action disableValue = (key: string) => {
		this.allDisabled = { ...this.allDisabled, [key]: false };
	};

	@action enableValue = (key: string) => {
		this.allDisabled = { ...this.allDisabled, [key]: false };
	};

	@computed get isAdmin() {
		return this.roles?.some((r) => r.id === "yrB6vc5Ip3r");
	}

	@computed
	get organisationUnits() {
		const units = this.userOrgUnits.map((unit: any) => {
			return {
				id: unit.id,
				pId: unit.pId || "",
				value: unit.id,
				title: unit.name,
				isLeaf: unit.leaf,
			};
		});
		return units;
	}

	@computed
	get processedPrograms() {
		return this.programs.map(({ id, name }) => {
			return { id, name };
		});
	}

	// @computed get columns() {
	// 	if (this.data) {
	// 		return this.availableDataElements
	// 			.filter((de: any) => de.selected)
	// 			.map((col: any) => {
	// 				return {
	// 					key: col.id,
	// 					title: col.name,
	// 					// width: 100,
	// 					dataIndex: "dataValues",
	// 					render: (values: any) => {
	// 						const dv = values.find((dv) => dv.dataElement == col.id);
	// 						return dv?.value;
	// 					},
	// 				};
	// 			});
	// 	}
	// 	return [];
	// }
	@computed get columns() {
		if (this.data) {
			// check case number
			const caseNumberColumn = {
				key: 'ZKBE8Xm9DJG',
				title: 'Case Number',
				dataIndex: 'dataValues',
				render: (values: any) => {
					const dv = values.find((dv) => dv.dataElement == "ZKBE8Xm9DJG");
					return dv?.value;
				},
			};

			const surnameColumn = {
				key: 'Q7VM7swIWb6',
				title: 'Surname',
				dataIndex: 'dataValues',
				render: (values: any) => {
					const dv = values.find((dv) => dv.dataElement == "Q7VM7swIWb6");
					return dv?.value;
				},
			};

			const givenNameColumn = {
				key: 'QmcOqkcNTip',
				title: 'Given Names',
				dataIndex: 'dataValues',
				render: (values: any) => {
					const dv = values.find((dv) => dv.dataElement == "QmcOqkcNTip");
					const fullname = values.find((dv) => dv.dataElement == "ZYKmQ9GPOaF")?.value;
					if (!!fullname) {
						return fullname;
					}
					return dv?.value;
				},
			};

			const otherNameColumn = {
				key: 'tuGPnGHWqQn',
				title: 'Other Name',
				dataIndex: 'dataValues',
				render: (values: any) => {
					const dv = values.find((dv) => dv.dataElement == "tuGPnGHWqQn");
					return dv?.value;
				},
			};

			const otherColumns = this.availableDataElements
				.filter((de: any) => de.selected && !['ZKBE8Xm9DJG', 'Q7VM7swIWb6', 'QmcOqkcNTip', 'tuGPnGHWqQn'].includes(de.id))
				.map((col: any) => {
					return {
						key: col.id,
						title: col.name,
						// width: 100,
						dataIndex: "dataValues",
						render: (values: any) => {
							const dv = values.find((dv) => dv.dataElement == col.id);
							return dv?.value;
						},
					};
				});

			return [caseNumberColumn, surnameColumn, givenNameColumn, otherNameColumn, ...otherColumns];
		}
		return [];
	}


	@action getdlcolumns(data) {
		if (!!data && this.availableDataElements.length > 0) {
			const columns = this.availableDataElements.map((col: any) => {
				const found = data.headers.find((c: any) => {
					return col.id === c.name;
				});
				return {
					key: found.name,
					title: col.realname,
					dataIndex: found.name,
					render: (text: any, row: any) => {
						return row[found.i];
					},
				};
			});

			return dlcolumns.map((c) => columns.find((de) => de.key == c));
		}
		return [];
	}

	getOrgUnitName = (id: string) => {
		const found = this.programOrganisationUnits.find((u: any) => u.id === id);
		if (found) {
			return found.name;
		} else {
			const found = this.userOrgUnits.find((u: any) => u.id === id);
			if (!!found) return found.name;
		}
		return "";
	};

	getCurrentOrgUnitLevel = () => {
		return this.getOrgUnitLevel(this.selectedOrgUnit);
	};

	getOrgUnitLevel = (id: string) => {
		const found = this.userOrgUnits.find((u: any) => u.id === id);
		if (!!found) return found.level;
		return 0;
	};

	getOrgUnitLevels = (id: string) => {
		const found = this.programOrganisationUnits.find((u: any) => u.id === id);

		if (found) {
			return found.ancestors;
		}
		return [];
	};

	@computed get printColumns() {
		return this.availablePrintDataElements.filter((de: any) => de.selected);
	}

	@computed get currentOrganisation() {
		const current: any = this.programOrganisationUnits.find(
			(u: any) => u.id === this.selectedOrgUnit
		); /** !!!!!!!!!! */

		// this.programOrganisationUnits.forEach((val) =>
		//   console.log("OR UNIT IS ", val)
		// );
		// console.log("programOrganisationUnits are", this.programOrganisationUnits);
		// console.log("and selectedOrgUnit is ", this.selectedOrgUnit);
		if (current) {
			return current.name;
		}
		return "";
	}

	@computed get currentOrganisationTree() {
		const current: any = this.programOrganisationUnits.find(
			(u: any) => u.id === this.selectedOrgUnit
		); /** !!!!!!!!!! */
		if (current) {
			return current.ancestors
				?.map((a) => a.name?.trim())
				.concat(current.name?.trim())
				.join(" / ");
		}
		return "";
	}

	@computed get selectedOrgUnitName() {
		const current: any = this.userOrgUnits.find(
			(u: any) => u.id === this.selectedOrgUnit
		);

		if (current) {
			return current.name;
		}
		return "";
	}

	@computed get canInsert() {
		console.log("this.selectedOrgUnit is ", this.selectedOrgUnit);
		console.log("this.selectedNationality is ", this.selectedNationality);
		console.log("this.currentOrganisation is ", this.currentOrganisation);
		return (
			this.selectedOrgUnit &&
			this.selectedNationality &&
			this.currentOrganisation
		);
	}

	@computed get canFetchData() {
		console.log("this.selectedOrgUnit is ", this.selectedOrgUnit);
		console.log("this.selectedNationality is ", this.selectedNationality);
		console.log("this.currentOrganisation is ", this.currentOrganisation);
		return (
			this.selectedOrgUnit && this.selectedNationality
			// this.currentOrganisation
		);
	}
	@computed get currentEventOrgUnit() {
		//console.log("cuureEvOr", this.data.headers)
		if (this.data && this.currentEvent) {
			// const orgidx = this.data.headers.findIndex((h) => h.name === "orgUnit");
			//console.log("orgidx", orgidx)
			return this.currentEvent.orgUnit;
		}

		return null;
	}

	@computed get defaultValues() {
		const obj = this.currentEvent ?? this.currentEventObj;
		if (!!obj) {
			const d = obj.dataValues
				.map((de) => {
					let value = de.value;

					if (dateFields.indexOf(de.dataElement) !== -1 && value !== "") {
						value = moment(value);
					} else if (de.dataElement === "jY3K6Bv4o9Q") {
						value = value === "true" ? "Yes" : "No";
					} else if (value === "true") {
						value = true;
					} else if (value === "false") {
						value = false;
					}
					return [de.dataElement, value];
				})
				// Keep all values except null/undefined — preserve 0, false, and empty string
				.filter((v: any) => v[1] !== null && v[1] !== undefined);

			const dFromPairs = fromPairs(d);
			console.log("dfp", dFromPairs);
			if (!!this.currentEventObj) {
				const nonemptylsdata = Object.entries(this.lsdata).reduce(
					(acc, [key, value]) => {
						if (value !== null && value !== undefined && value !== "") {
							acc[mcodmap[key] ?? key] = value;
						}
						return acc;
					},
					{}
				);
				return { ...nonemptylsdata, ...dFromPairs };
			}
			return dFromPairs;
		}
		return {};
	}
}

export const store = new Store();

function getHeaders(headers: Array<any>) {
	return headers.map((h: any, index: number) => {
		return {
			name: h.name,
			index,
		};
	});
}

function getHeaderIndexes(headers: Array<any>) {
	const orgUnitIndex = headers.findIndex((h: any) => h.name === "orgUnit");
	const codIndex = headers.findIndex((h: any) => h.name === "QTKk2Xt8KDu");
	const causeOfDeathIndex = headers.findIndex(
		(h: any) => h.name === "sJhOdGLD5lj"
	);
	const birthIndex = headers.findIndex((h: any) => h.name === "RbrUuKFSqkZ");
	const deathIndex = headers.findIndex((h: any) => h.name === "i8rrl8YWxLF");
	const sexIndex = headers.findIndex((h: any) => h.name === "e96GB4CXyd3");
	return {
		codIndex,
		causeOfDeathIndex,
		birthIndex,
		deathIndex,
		sexIndex,
		orgUnitIndex,
	};
}
