// referredValueSavedHere
import React, { useEffect, useState, useRef, useMemo } from "react";
import {
    Button,
    Card,
    Checkbox,
    DatePicker,
    Typography,
    Form,
    Input,
    InputNumber,
    Popconfirm,
    Select,
    Tooltip,
    Modal,
    Drawer,
    List,
    Alert,
    notification,
    Col,
    Row,
    Switch,
    Radio, message
} from "antd";
import { SettingOutlined } from "@ant-design/icons";
import ReactToPrint from "react-to-print";
import { observer } from "mobx-react";
import { FormPrint } from "./FormPrint";
import { ICDField } from "./ICDField";
import { useStore } from "../Context";
import { isArray, isEmpty } from "lodash";

import moment from "moment";
import DistSearchPopup, { validSearchTypes } from "./DistrictSearch";
import ApprovalRights from "./ApprovalRights";
import Declarations from "./Declarations";

// Languages
import englishString from "../assets/english.json";
import frenchString from "../assets/french.json";
import { useNinApi } from "../utils/ninApi"
import { useTranslation } from "../utils/useTranslation";
import { dateFields, mcodmap } from "../Store";
import { DorisReportModal } from "./DorisReportModal";

// interface languageString {
//   English: string[]; // IFoo is indexable; not a new property
//   French: string[]; // IFoo is indexable; not a new property
// }

const allLanguages = [
    {
        langName: "English",
        lang: englishString,
    },
    {
        langName: "French",
        lang: frenchString,
    },
];
// const BASE_URL = process.env.NODE_ENV=== 'development' ? `${process.env.REACT_APP_DHIS2_BASE_URL}` : '/';
// console.log(BASE_URL);

const customFieldsReservedIds = [
    { name: "D1", id: "BflLLM6wTq5" },
    { name: "D2", id: "aQd347vDjhK" },
    { name: "D3", id: "SQw0IhLBgkS" },
    { name: "D4", id: "SLDIy0rbjWS" },
    { name: "D5", id: "R1uBQrbwcFx" },
    { name: "D6", id: "ouvH3MBYJgX" },
    { name: "D7", id: "MwQAAXyvQ1G" },
    { name: "D8", id: "hoO0m77Cub5" },
    { name: "D9", id: "dq4CSNwF74B" },
    { name: "D10", id: "a456PAfVR0J" },
];

const { Option } = Select;
const { Title } = Typography;


export const DataEntryForm = observer(() => {
    const [form] = Form.useForm();
    const [drawerVisible, setDrawerVisible] = useState(false);
    const tr = useTranslation();
    const [dorisReport, setDorisReport] = useState("");

    const store = useStore();
    const optionSets = store.optionSets;
    const [activeLanguage, setActiveLanguage] = useState(
        store.activeLanguage || allLanguages[0]
    );
    const [activeLanguageString, setActiveLanguageString] = useState(
        store.activeLanguage?.LanguageName || allLanguages[0].langName
    );

    // Declarations
    const [declarations, setDeclarations] = useState({
        u9tYUv6AM51: false,
        ZXZZfzBpu8a: false,
        cp5xzqVU2Vw: false,
        lu9BiHPxNqH: "",
    });
    const [declarationsDefault, setDeclarationsDefault] = useState({
        u9tYUv6AM51: false,
        ZXZZfzBpu8a: false,
        cp5xzqVU2Vw: false,
        lu9BiHPxNqH: "",
    });
    const handleDeclarationOutput = (output: {
        u9tYUv6AM51: false;
        ZXZZfzBpu8a: false;
        cp5xzqVU2Vw: false;
        lu9BiHPxNqH: "";
    }) => {
        setDeclarations(output);
    };

    // Approval STatus
    const [approvalStatus, setApprovalStatus] = useState("Not Approved");
    const [
        approvalStatusFromEditedForm,
        setApprovalStatusFromEditedForm,
    ] = useState("");

    // Editing status
    const [editing, setEditing] = useState(false);

    // Searches (District and sub county)
    let anyArrayType: any[] = [];
    const [limitedArray, setLimitedArray] = useState(anyArrayType);
    const [limitedDistrictParent, setLimitedDistrictParent] = useState("");
    const [limitedRegionParent, setLimitedRegionParent] = useState("");
    // const [chosenRegion, setChosenRegion] = useState("");
    const [chosenDistrict, setChosenDistrict] = useState("");
    const [chosenFacility, setChosenFacility] = useState("");
    const [subCountyOptions, setSubCountyOptions] = useState<any[]>([]);

    const [chosenRegionToSubmit, setChosenRegionToSubmit] = useState("");
    const [chosenDistrictToSubmit, setChosenDistrictToSubmit] = useState("");
    const [chosenFacilityToSubmit, setChosenFacilityToSubmit] = useState("");
    const [chosenSubCounty, setChosenSubcounty] = useState("");
    const [chosenDistrictId, setChosenDistrictId] = useState("");

    const [selectedPlaceOfDeath, setSelectedPlaceOfDeath] = useState<string | undefined>();

    //new region, district dropdowns
    const [regions, setRegions] = useState([]);
    const [chosenRegion, setChosenRegion] = useState(null);
    const [selectedRegion, setSelectedRegion] = useState(null);
    const [districts, setDistricts] = useState([]);


    //blacklist
    const blacklistedValues = ["N"];
    const [showBlackListWarning, setShowBlackListWarning] = useState(false);
    const [blackListedFound, setBlackListedFound] = useState(false);
    const [underlyingCauseKey, setUnderlyingCauseKey] = useState(Math.random());
    const [timeoutToClosePopup, setTimeoutToClosePopup] = useState(
        setTimeout(() => {
            return;
        }, 1000)
    );

    // Frame B hack
    const [disableFrameB, setDisableFrameB] = useState(true);
    const [disableFrameB2, setDisableFrameB2] = useState(true);
    const [frameBKey1, setFrameBKey1] = useState("1");
    const [frameBKey2, setFrameBKey2] = useState("2");
    const [frameBKey3, setFrameBKey3] = useState("3");
    const [frameBKey4, setFrameBKey4] = useState("4");

    // Fetal / Still born hack
    const [disableFetal, setDisableFetal] = useState(false);
    const [fetalDisableKey, setFetalDisableKey] = useState("5");

    // Check if woman was recently pregnant
    const [showPregnancyReminder, setShowPregnancyReminder] = useState(false);
    const [enablePregnantQn, setEnablePregnantQn] = useState(false);
    const [enablePregnantQnKey, setEnablePregnantQnKey] = useState("6");
    const [personsAge, setPersonsAge] = useState(0);
    const [personsAgeInDays, setPersonsAgeInDays] = useState(0);
    const [personsGender, setPersonsGender] = useState("");
    const [womanWasPregnant, setWomanWasPregnant] = useState(false);
    const [pregnancyStatus, setPregnancyStatus] = useState<string | null>(null);


    // Keys related to was woman pregnant
    const [pregnantKey1, setPregnantKey1] = useState("7");
    const [pregnantKey2, setPregnantKey2] = useState("8");
    const [pregnantKey3, setPregnantKey3] = useState("9");
    const [pregnantKey4, setPregnantKey4] = useState("10");
    const [pregnantKey5, setPregnantKey5] = useState("11");
    const [pregnantKey6, setPregnantKey6] = useState("12");
    const [pregnantKey7, setPregnantKey7] = useState("13");

    const [idTypeLabel, setIDTypeLabel] = useState("Identification Number");
    const [idTypeOptions, setIDTypeOptions] = useState([]);

    const refreshAllPregnantKeys = (bool: boolean) => {
        setWomanWasPregnant(bool);
    };

    useEffect(() => {
        setPregnantKey1(`${Math.random()}`);
        setPregnantKey2(`${Math.random()}`);
        setPregnantKey3(`${Math.random()}`);
        setPregnantKey4(`${Math.random()}`);
        setPregnantKey5(`${Math.random()}`);
        setPregnantKey6(`${Math.random()}`);
        setPregnantKey7(`${Math.random()}`);
    }, [womanWasPregnant]);

    const titleBackgroundColor = "#f5f4f4";

    // Testing
    type altSearchBooleansOptions = {
        [key: string]: boolean;
    };
    let altSearchBooleans: altSearchBooleansOptions = {
        a: true,
        b: true,
        c: true,
        d: true,
    };
    const [altSearchIsDisabled, setAltSearchIsDisabled] = useState(
        altSearchBooleans
    );

    //   ICD Field Keys
    const [AKey, setAKey] = useState(Math.random());
    const [BKey, setBKey] = useState(Math.random());
    const [CKey, setCKey] = useState(Math.random());
    const [DKey, setDKey] = useState(Math.random());

    const [underlyingCauseCode, setUnderlyingCauseCode] = useState("");
    const [underlyingCauseText, setUnderlyingCauseText] = useState("");
    const [underlyingCauseURI, setUnderlyingCauseURI] = useState("");
    const [dorisValue, setDorisValue] = useState<any>({});
    const finalCauseOptions = useMemo(() => {
        return {
            ...({ [underlyingCauseCode]: underlyingCauseText }),
            ...({ [dorisValue.code]: dorisValue.text })
        }
    }, [underlyingCauseCode, underlyingCauseText, dorisValue])

    type underlyingCauseObjectOptions = {
        [key: string]: string;
    };
    let underlyingCauseObject: underlyingCauseObjectOptions = {
        a: "",
        b: "",
        c: "",
        d: "",
        diseaseTitleA: "",
        diseaseTitleB: "",
        diseaseTitleC: "",
        diseaseTitleD: "",
        diseaseURIA: "",
        diseaseURIB: "",
        diseaseURIC: "",
        diseaseURID: "",
    };
    const [underlyingCauses, setUnderlyingCauses] = useState(
        underlyingCauseObject
    );

    const [defaultUCause, setDefaultUCause] = useState<any>({});

    const [underlyingCauseChosen, setUnderlyingCauseChosen] = useState(false);

    const [underlyingCauseAlt, setUnderlyingCauseAlt] = useState("");

    // Handle auto calculate of unknown age
    const [ageKnown, setAgeKnown] = useState(true);
    const [forceResetDOB, setForceResetDOB] = useState(false);
    const [actualTimeOfDeath, setActualTimeOfDeath] = useState(moment());

    // End of Testing
    const [fromReview, setFromReview] = useState(false);


    useEffect(() => {
        const fetchRegions = async () => {
            try {
                const allRegionsReceived = await store.getRegions();
                setRegions(allRegionsReceived.organisationUnits);
            } catch (error) {
                console.error("Error fetching regions:", error);
            }
        };

        fetchRegions();
    }, []);


    // Handle region change
    const handleRegionChange = (regionId) => {
        const selected = regions.find((region) => region.id === regionId);
        setSelectedRegion(regionId);
        setDistricts(selected?.children || []); // Update districts based on selected region
    };

    // Handle district change
    const handleDistrictChange = (districtId) => {
        const selectedDistrict = districts.find((district) => district.id === districtId);
        setChosenDistrict(districtId);
        console.log("Chosen district:", selectedDistrict.displayName);
        setChosenDistrictToSubmit(selectedDistrict.displayName); // Set chosen district to submit
        setChosenDistrictId(districtId); // Store district ID
    };

    // console.log("set reions",regions)
    // console.log("set district",districts)
    // console.log("chosen district",chosenDistrictToSubmit)
    console.log("chosen district", chosenDistrictId)

    //subcounties
    useEffect(() => {
        console.log("chosen district2", chosenDistrictId)

        if (chosenDistrictToSubmit) {
            fetchSubCounties();
        }
    }, [chosenDistrictId]);

    // const fetchSubCounties = async () => {
    //
    //     try {
    //         const response = await fetch(
    //             `/api/organisationUnits/${chosenDistrictId}?paging=false&fields=level,id,children[id,displayName,level]`
    //             // `https://hmis-tests.health.go.ug/api/organisationUnits/${chosenDistrictId}?paging=false&fields=level,id,children[id,displayName,level]`
    //             // `https://hmis.health.go.ug/api/organisationUnits/${chosenDistrictId}?paging=false&fields=level,id,children[id,displayName,level]`
    //         );
    //         const data = await response.json();
    //         console.log("sub data", data);
    //
    //         if (data?.children?.length) {
    //             // Extract sub-counties (level 4) from the response
    //             const matchingSubCounties = data.children
    //                 .filter((child: any) => child.level === 4) // Ensure they are sub-counties
    //                 .map((child: any) => ({
    //                     id: child.id,
    //                     displayName: child.displayName,
    //                 }));
    //
    //             console.log("Matching Sub-Counties:", matchingSubCounties);
    //             setSubCountyOptions(matchingSubCounties);
    //         } else {
    //             setSubCountyOptions([]); // Clear options if no children found
    //         }
    //     } catch (error) {
    //         console.error("Error fetching sub-counties:", error);
    //     }
    // };

    // const fetchSubCounties = async () => {
    //
    //     // console.log("dist", chosenDistrictToSubmit);
    //     // console.log("district id", chosenDistrictId);
    //     try {
    //         const response = await fetch(
    //             // "api/organisationUnits.json?level=5&paging=false&fields=id,displayName,level,parent[id,displayName,level,parent[id,displayName,level]]"
    //             // "https://hmis-tests.health.go.ug/api/organisationUnits.json?level=5&paging=false&fields=id,displayName,level,parent[id,displayName,level,parent[id,displayName,level]]"
    //             `https://hmis-tests.health.go.ug/api/organisationUnits/${chosenDistrictId}?paging=false&fields=level,id,children[id,displayName,level]`
    //         );
    //         const data = await response.json();
    //         console.log("sub data", chosenDistrictId);
    //
    //         if (data?.organisationUnits?.length) {
    //             // Filter sub-counties where the district (level 3) matches chosenDistrictToSubmit
    //             const matchingSubCounties = data.organisationUnits
    //                 .filter((unit: any) =>
    //                     unit?.parent?.parent?.level === 3 &&
    //                     unit.parent.parent.displayName === chosenDistrictToSubmit
    //                 )
    //                 .map((unit: any) => ({
    //                     id: unit.id,
    //                     displayName: unit.displayName
    //                 }));
    //
    //             // console.log("Matching Sub-Counties:", matchingSubCounties);
    //             setSubCountyOptions(matchingSubCounties);
    //         }
    //     } catch (error) {
    //         console.error("Error fetching sub-counties:", error);
    //     }
    // };

    const fetchSubCounties = async () => {
        try {
            const url = `/api/organisationUnits/${chosenDistrictId}?paging=false&fields=level,id,children[id,displayName,level,children[id,displayName,level]]`;
            const data = await store.engine.link.fetch(url);
            console.log("sub data", data);

            // Extract sub-counties (level 5) from the district's children
            // If direct children are level 5, use them; otherwise get level 5 from nested children
            let subCounties = (data?.children ?? []).filter(child => child.level === 5);

            // If no level 5 found in direct children, check in grandchildren (for DLGs at level 4)
            if (subCounties.length === 0) {
                const level4DLGs = (data?.children ?? []).filter(child => child.level === 4);
                level4DLGs.forEach((dlg: any) => {
                    const level5SubCounties = (dlg?.children ?? []).filter(child => child.level === 5);
                    subCounties = [...subCounties, ...level5SubCounties];
                });
            }

            const formattedSubCounties = subCounties.map((subcounty) => ({
                id: subcounty.id,
                displayName: subcounty.displayName,
            }));

            setSubCountyOptions(formattedSubCounties);
        } catch (error) {
            console.error("Error fetching sub-counties:", error);
        }
    };

    const onFinish = async (values: any) => {
        // if (!store.selectedNationality) {
        // 	notification.error({
        // 		message: "Validation Error!",
        // 		description: `Please select a nationality!`,
        // 		onClick: () => {},
        // 		duration: 3,
        // 	  });
        // 	return;
        // }
        // Force form to acknowledge controlled values


        const parentWindowUrl = window.parent.location.href;
        // console.log("window url is", parentWindowUrl)

        // check for  parent window url
        if (parentWindowUrl.includes('tbl-ecbss-dev.health.go.ug/')) {
            // console.log("parent window url is", parentWindowUrl)

            // Load values from local storage
            const storedDataString = localStorage.getItem("mcodtemp");

            // Check if the stored data exists
            if (storedDataString) {
                const originalData = JSON.parse(storedDataString);
                console.log("original data", originalData)

                // Specify which keys to include from the stored data
                // const keysToInclude = ['event', 'orgUnit'];

                // Filter the originalData object to include only specified keys
                // const filteredData = Object.fromEntries(
                //     Object.entries(originalData)
                //         .filter(([key]) => keysToInclude.includes(key))
                // );

                const newValues = {
                    attributeCategoryOptions: 'l4UMmqvSBe5',
                    // ...filteredData,
                    event: store.currentEvent,
                    orgUnit: store.selectedOrgUnit,
                    program: 'vf8dN49jprI',
                    programStage: 'aKclf7Yl1PE',
                    // eventDate: moment(),
                    eventDate: form.getFieldValue("i8rrl8YWxLF"),
                    dataValues: [
                        { dataElement: 'ZKBE8Xm9DJG', value: values['ZKBE8Xm9DJG'] },
                        { dataElement: 'MOstDqSY0gO', value: values['MOstDqSY0gO'] },
                        { dataElement: 'ZYKmQ9GPOaF', value: values['ZYKmQ9GPOaF'] },
                        { dataElement: 'twVlVWM3ffz', value: values['twVlVWM3ffz'] },
                        { dataElement: 'zwKo51BEayZ', value: values['zwKo51BEayZ'] },
                        { dataElement: 'b70okb06FWa', value: values['b70okb06FWa'] },
                        { dataElement: 't5nTEmlScSt', value: values['t5nTEmlScSt'] },
                        { dataElement: 'RbrUuKFSqkZ', value: values['RbrUuKFSqkZ'] },
                        { dataElement: 'u44XP9fZweA', value: values['u44XP9fZweA'] },
                        { dataElement: 'q7e7FOXKnOf', value: values['q7e7FOXKnOf'] },
                        { dataElement: 'e96GB4CXyd3', value: values['e96GB4CXyd3'] },
                        { dataElement: 'i8rrl8YWxLF', value: values['i8rrl8YWxLF'] },
                        { dataElement: 'sfpqAeqKeyQ', value: values['sfpqAeqKeyQ'] },
                        { dataElement: 'zD0E77W4rFs', value: values['zD0E77W4rFs'] },
                        { dataElement: 'cSDJ9kSJkFP', value: values['cSDJ9kSJkFP'] },
                        { dataElement: 'Ylht9kCLSRW', value: values['Ylht9kCLSRW'] },
                        { dataElement: 'uckvenVFnwf', value: values['uckvenVFnwf'] },
                        { dataElement: 'ZFdJRT3PaUd', value: values['ZFdJRT3PaUd'] },
                        { dataElement: 'Op5pSvgHo1M', value: values['Op5pSvgHo1M'] },
                        { dataElement: 'k9xdBQzYMXo', value: values['k9xdBQzYMXo'] },
                        { dataElement: 'FhHPxY16vet', value: values['FhHPxY16vet'] },
                        { dataElement: 'PaoRZbokFWJ', value: values['PaoRZbokFWJ'] },
                        { dataElement: 'QTKk2Xt8KDu', value: values['QTKk2Xt8KDu'] },
                        { dataElement: 'u9tYUv6AM51', value: values['u9tYUv6AM51'] },
                        { dataElement: 'WkXxkKEJLsg', value: values['WkXxkKEJLsg'] },
                        { dataElement: 'W0r4m6NiLsy', value: values['W0r4m6NiLsy'] }, //eventdate
                        { dataElement: 'ZkNDFfFSTYg', value: defaultValue }, // Linked value

                    ],
                };


                const saveDataUrl = 'https://hmis-tests.health.go.ug/api/40/events';

                // Post data to a different URL
                try {
                    const response = await fetch(saveDataUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Basic ' + btoa('hisp.skununka:Nomisr123$$$$'),
                        },
                        body: JSON.stringify(newValues),
                        credentials: 'include',
                    });

                    console.log("payload values are", newValues);
                    // console.log('storage data:', filteredData)

                    // Check if the request was successful
                    if (response.ok) {
                        console.log('Data saved successfully!');
                        localStorage.clear()
                        localStorage.removeItem("mcodtemp");
                        // window.close();
                        (window.parent as any).closeIframe();
                        // window.parent.closeIframe();
                    } else {
                        console.error('Failed to save data:', response.statusText);
                    }
                } catch (error) {
                    console.error('Error saving data:', error);
                }


            } //close if stored data

            // console.log("filtered", filteredData)


        } else {

            // console.warn('Else block, Parent window URL does not match the expected URL.');

            // Handle the case where the parent window URL does not match

            if (approvalStatus) {
                values.twVlVWM3ffz = approvalStatus;
            }
            if (chosenRegionToSubmit || chosenRegion) {
                values.zwKo51BEayZ = chosenRegionToSubmit || chosenRegion;
            }
            // if() values.dTd7txVzhgY = underlyingCauseCode; // ???
            if (underlyingCauseText) {
                values.QTKk2Xt8KDu = underlyingCauseText;
            } // text
            if (underlyingCauseCode) {
                values.sJhOdGLD5lj = underlyingCauseCode;
            } // term = code
            if (underlyingCauseURI) {
                values.L97MrAMAav9 = underlyingCauseURI;
            } // uri
            if (chosenDistrictToSubmit) {
                values.u44XP9fZweA = chosenDistrictToSubmit;
            } // district
            if (chosenSubCounty) {
                values.t5nTEmlScSt = chosenSubCounty;
            } // subcounty
            if (chosenFacilityToSubmit || chosenFacility) {
                values.QDHeWslaEoH = chosenFacilityToSubmit || chosenFacility;
            }
            console.log("Saved ", chosenFacilityToSubmit);
            values = {
                ...values,
                ...declarations,
            };
            // Object.keys(declarations).forEach(item=>{
            //   if(declarations[item]){
            //     values[item]=declarations[item]
            //   }

            // })
            console.log("values", values);
            localStorage.clear();
            console.log('Local storage cleared successfully.');

            await store.addEvent(values);
            if (!!fromReview) {
                let rvalues = {};
                Object.keys(mcodmap).forEach(rkey => {
                    const val = values[mcodmap[rkey]];
                    rvalues[rkey] = !!val ? val : "";
                })
                console.log("rvalues", rvalues);
                (window.parent as any).returntoreview?.(rvalues);
                (window.parent as any).closeIframe?.();
            }


        }

        // if (approvalStatus) {
        // 	values.twVlVWM3ffz = approvalStatus;
        // }
        // if (chosenRegionToSubmit || chosenRegion) {
        // 	values.zwKo51BEayZ = chosenRegionToSubmit || chosenRegion;
        // }
        // // if() values.dTd7txVzhgY = underlyingCauseCode; // ???
        // if (underlyingCauseText) {
        // 	values.QTKk2Xt8KDu = underlyingCauseText;
        // } // text
        // if (underlyingCauseCode) {
        // 	values.sJhOdGLD5lj = underlyingCauseCode;
        // } // term = code
        // if (underlyingCauseURI) {
        // 	values.L97MrAMAav9 = underlyingCauseURI;
        // } // uri
        // if (chosenDistrictToSubmit) {
        // 	values.u44XP9fZweA = chosenDistrictToSubmit;
        // } // district
        // if (chosenSubCounty) {
        // 	values.t5nTEmlScSt = chosenSubCounty;
        // } // subcounty
        // if (chosenFacilityToSubmit || chosenFacility) {
        // 	values.QDHeWslaEoH = chosenFacilityToSubmit || chosenFacility;
        // }
        // console.log("Saved ", chosenFacilityToSubmit);
        // values = {
        // 	...values,
        // 	...declarations,
        // };
        // // Object.keys(declarations).forEach(item=>{
        // //   if(declarations[item]){
        // //     values[item]=declarations[item]
        // //   }
        //
        // // })
        // // values.attributeCategoryOptions = 'l4UMmqvSBe5';
        // console.log("values", values);
        //
        // await store.addEvent(values);
        // if (!!fromReview) {
        // 	let rvalues = {};
        // 	Object.keys(mcodmap).forEach(rkey => {
        // 		const val = values[mcodmap[rkey]];
        // 		rvalues[rkey] = !!val ? val : "";
        // 	})
        // 	console.log("rvalues", rvalues);
        // 	(window.parent as any).returntoreview?.(rvalues);
        // 	(window.parent as any).closeIframe?.();
        // }


    };


    // const onCancel = () => {
    // 	if (!!fromReview) {
    // 		// console.log("window", window);
    // 		// window.close();
    // 		// (window.parent as any).closeIframe();
    // 		localStorage.clear()
    // 		window.location.href = "/";
    // 	} else {
    // 		store.showEvents();
    // 		store.enableForm();
    // 	}
    // }

    const onCancel = () => {
        // const allowedUrl = 'tbl-ecbss-dev.health.go.ug';
        // if (window.location.href.includes(allowedUrl)) {
        //     window.close();
        // } else {

        if (!!fromReview) {
            if (window !== window.parent) {
                // Your app is loaded in an iframe, so close the iframe
                (window.parent as any).closeIframe();
            } else {
                // Your app is not in an iframe, so close the window
                // window.close();
                localStorage.clear()
                // window.location.href = "/";
                // window.location.href = "/api/apps/Medical-Certificate-of-Cause-of-Death/index.html";
                store.showEvents();
                // store.enableForm();
            }
        } else {
            store.showEvents();
            store.enableForm();
        }
        // }
    }


    const notTomorrow = (date: moment.Moment) => {
        return date.isAfter(moment());
    };

    useEffect(() => {
        // store.loadUserOrgUnits().then(() => {
        // 	setOptionSets(store.optionSets);
        // });

        store.enableValue("t5nTEmlScSt");
        store.enableValue("u44XP9fZweA");
        store.enableValue("zwKo51BEayZ");
        store.enableValue("dsiwvNQLe5n");
        store.enableValue("xNCSFrgdUgi");
        store.enableValue("se3wRj1bYPo");

        store.enableValue("ZYKmQ9GPOaF");
        store.enableValue("e96GB4CXyd3");
        store.enableValue("roxn33dtLLx");
        store.enableValue("RbrUuKFSqkZ");
        store.enableValue("q7e7FOXKnOf");
        store.enableValue("FGagV1Utrdh");

    }, [store]);

    const [testVal, setTestVal] = useState("");
    const buttonA = () => {
        // form.setFieldsValue({ cSDJ9kSJkFP: "" });
        // button()
        setTestVal("");
    };
    const [testVal2, setTestVal2] = useState("");
    const buttonB = () => {
        // form.setFieldsValue({ cSDJ9kSJkFP: "" });
        // button()
        setTestVal2("");
    };
    const [testVal3, setTestVal3] = useState("");
    const buttonC = () => {
        // form.setFieldsValue({ cSDJ9kSJkFP: "" });
        // button()
        setTestVal3("");
    };

    const [testVal4, setTestVal4] = useState("");
    const buttonD = () => {
        // form.setFieldsValue({ cSDJ9kSJkFP: "" });
        // button()
        setTestVal4("");
    };

    // const [testValUnderlying, setTestValUnderlying] = useState("");
    // const buttonUnderlying = () => {
    //     // form.setFieldsValue({ cSDJ9kSJkFP: "" });
    //     // button()
    //     setTestValUnderlying("");
    // };

    const handleEstimateAge = () => {
        if (ageKnown) return;

        // const dateOfDeath = form.getFieldValue("i8rrl8YWxLF");
        const dateOfDeath = moment(actualTimeOfDeath);
        const ageOfIndividual = form.getFieldValue("q7e7FOXKnOf");
        const dateOfBirth = form.getFieldValue("RbrUuKFSqkZ");

        if (!dateOfDeath) return;

        if (!ageOfIndividual) return;

        let estimatedAge = dateOfDeath.subtract(ageOfIndividual, "years");

        form.setFieldsValue({ RbrUuKFSqkZ: estimatedAge });
        setForceResetDOB(true);
    };

    useEffect(() => {
        const nationality = store.selectedNationality;
        if (nationality === "l4UMmqvSBe5") {
            setIDTypeLabel(tr("NIN"));
            form.setFieldsValue({ xxx6yjtuN2f: "National ID" });
        } else if (nationality === "VJU0bY182ND") { // foreigner
            setIDTypeLabel(tr("Identification Number"));
            form.setFieldsValue({ xxx6yjtuN2f: "" });
            setIDTypeOptions([
                "Passport",
                "Social Security Card",
                "National ID"
            ]);
        } else if (nationality === "wUteK0Om3qP") { // refugee
            setIDTypeLabel(tr("Identification Number"));
            form.setFieldsValue({ xxx6yjtuN2f: "" });
            setIDTypeOptions([
                "Passport",
                "Refugee Card",
                "National ID"
            ]);
        }
    }, [store?.selectedNationality])

    //CHECK FOR CASE NUMBER PREFIXES
    const checkMinistryCaseNumber = (_, value) => {

        const isValid = value && (value.includes('PERI') || value.includes('MATERNAL'));

        if (!isValid) {
            return Promise.reject('Value must include "PERI" or "MATERNAL"');
        }

        return Promise.resolve();
    };

    const ninValidation = store?.selectedNationality === "l4UMmqvSBe5" ? {
        rules: [
            { len: 14, message: "NIN should have 14 characters" }
        ],
        validateTrigger: "onBlur"
    } : {}

    const valuesChange = (changedValues: any, allValues: any) => {

        // if NIN given, fetch and fill other form areas
        if (!!changedValues.MOstDqSY0gO && store.selectedNationality === "l4UMmqvSBe5" && changedValues.MOstDqSY0gO.length == 14) {
            fetchAndFillUserInfo(changedValues.MOstDqSY0gO);
        }


        // Handling date of birth is unknown"
        if (changedValues.roxn33dtLLx) {
            console.log("Roxx changed to ", changedValues.roxn33dtLLx);
            if (`${changedValues.roxn33dtLLx}` === "Yes") {
                setAgeKnown(true);
            } else {
                setAgeKnown(false);
                // Clear the DOB field when disabled
                form.setFieldsValue({ RbrUuKFSqkZ: null });
            }
        }

        if (changedValues.xxx6yjtuN2f) {
            if (changedValues.xxx6yjtuN2f === "Passport")
                setIDTypeLabel("Passport Number");
            else if (changedValues.xxx6yjtuN2f === "Social Security Card")
                setIDTypeLabel("Social Security Number");
            else if (changedValues.xxx6yjtuN2f === "Refugee Card")
                setIDTypeLabel("Refugee Card Number");
            else
                setIDTypeLabel("NIN");
        }

        // If the changed value is date of death or
        if (changedValues.q7e7FOXKnOf || changedValues.i8rrl8YWxLF) {
            console.log("Maybe we should estimate the age...");
            handleEstimateAge();
        }

        if (
            changedValues.FhHPxY16vet &&
            form.getFieldValue("FhHPxY16vet") == true
        ) {
            //Desease
            //store.disableValue("FhHPxY16vet"); //Disease
            store.disableValue("gNM2Yhypydx"); //accident
            store.disableValue("wX3i3gkTG4m"); //Intentional self-harm
            store.disableValue("KsGOxFyzIs1"); //Assault
            store.disableValue("tYH7drlbNya"); //Legal intervention
            store.disableValue("xDMX2CJ4Xw3"); //War
            store.disableValue("b4yPk98om7e"); //Could not be determined
            store.disableValue("fQWuywOaoN2"); //Pending investigation
            store.disableValue("o1hG9vr0peF"); //Unknown
        }

        if (
            changedValues.gNM2Yhypydx &&
            form.getFieldValue("gNM2Yhypydx") == true
        ) {
            //Accident
            store.disableValue("FhHPxY16vet"); //Disease
            // store.disableValue("gNM2Yhypydx");//accident
            store.disableValue("wX3i3gkTG4m"); //Intentional self-harm
            store.disableValue("KsGOxFyzIs1"); //Assault
            store.disableValue("tYH7drlbNya"); //Legal intervention
            store.disableValue("xDMX2CJ4Xw3"); //War
            store.disableValue("b4yPk98om7e"); //Could not be determined
            store.disableValue("fQWuywOaoN2"); //Pending investigation
            store.disableValue("o1hG9vr0peF"); //Unknown
        }

        if (
            changedValues.wX3i3gkTG4m &&
            form.getFieldValue("wX3i3gkTG4m") == true
        ) {
            //Intentional self-harm
            store.disableValue("FhHPxY16vet"); //Disease
            store.disableValue("gNM2Yhypydx"); //accident
            // store.disableValue("wX3i3gkTG4m");//Intentional self-harm
            store.disableValue("KsGOxFyzIs1"); //Assault
            store.disableValue("tYH7drlbNya"); //Legal intervention
            store.disableValue("xDMX2CJ4Xw3"); //War
            store.disableValue("b4yPk98om7e"); //Could not be determined
            store.disableValue("fQWuywOaoN2"); //Pending investigation
            store.disableValue("o1hG9vr0peF"); //Unknown
        }

        if (
            changedValues.KsGOxFyzIs1 &&
            form.getFieldValue("KsGOxFyzIs1") == true
        ) {
            //Assault
            store.disableValue("FhHPxY16vet"); //Disease
            store.disableValue("gNM2Yhypydx"); //accident
            store.disableValue("wX3i3gkTG4m"); //Intentional self-harm
            // store.disableValue("KsGOxFyzIs1");//Assault
            store.disableValue("tYH7drlbNya"); //Legal intervention
            store.disableValue("xDMX2CJ4Xw3"); //War
            store.disableValue("b4yPk98om7e"); //Could not be determined
            store.disableValue("fQWuywOaoN2"); //Pending investigation
            store.disableValue("o1hG9vr0peF"); //Unknown
        }

        if (
            changedValues.tYH7drlbNya &&
            form.getFieldValue("tYH7drlbNya") == true
        ) {
            //Legal intervention
            store.disableValue("FhHPxY16vet"); //Disease
            store.disableValue("gNM2Yhypydx"); //accident
            store.disableValue("wX3i3gkTG4m"); //Intentional self-harm
            store.disableValue("KsGOxFyzIs1"); //Assault
            //store.disableValue("tYH7drlbNya");//Legal intervention
            store.disableValue("xDMX2CJ4Xw3"); //War
            store.disableValue("b4yPk98om7e"); //Could not be determined
            store.disableValue("fQWuywOaoN2"); //Pending investigation
            store.disableValue("o1hG9vr0peF"); //Unknown
        }

        if (
            changedValues.xDMX2CJ4Xw3 &&
            form.getFieldValue("xDMX2CJ4Xw3") == true
        ) {
            //War
            store.disableValue("FhHPxY16vet"); //Disease
            store.disableValue("gNM2Yhypydx"); //accident
            store.disableValue("wX3i3gkTG4m"); //Intentional self-harm
            store.disableValue("KsGOxFyzIs1"); //Assault
            store.disableValue("tYH7drlbNya"); //Legal intervention
            //store.disableValue("xDMX2CJ4Xw3");//War
            store.disableValue("b4yPk98om7e"); //Could not be determined
            store.disableValue("fQWuywOaoN2"); //Pending investigation
            store.disableValue("o1hG9vr0peF"); //Unknown
        }

        if (
            changedValues.b4yPk98om7e &&
            form.getFieldValue("b4yPk98om7e") == true
        ) {
            //Could not be determined
            store.disableValue("FhHPxY16vet"); //Disease
            store.disableValue("gNM2Yhypydx"); //accident
            store.disableValue("wX3i3gkTG4m"); //Intentional self-harm
            store.disableValue("KsGOxFyzIs1"); //Assault
            store.disableValue("tYH7drlbNya"); //Legal intervention
            store.disableValue("xDMX2CJ4Xw3"); //War
            //store.disableValue("b4yPk98om7e");//Could not be determined
            store.disableValue("fQWuywOaoN2"); //Pending investigation
            store.disableValue("o1hG9vr0peF"); //Unknown
        }

        if (
            changedValues.fQWuywOaoN2 &&
            form.getFieldValue("fQWuywOaoN2") == true
        ) {
            //Pending investigation
            store.disableValue("FhHPxY16vet"); //Disease
            store.disableValue("gNM2Yhypydx"); //accident
            store.disableValue("wX3i3gkTG4m"); //Intentional self-harm
            store.disableValue("KsGOxFyzIs1"); //Assault
            store.disableValue("tYH7drlbNya"); //Legal intervention
            store.disableValue("xDMX2CJ4Xw3"); //War
            store.disableValue("b4yPk98om7e"); //Could not be determined
            //store.disableValue("fQWuywOaoN2");//Pending investigation
            store.disableValue("o1hG9vr0peF"); //Unknown
        }

        if (
            changedValues.o1hG9vr0peF &&
            form.getFieldValue("o1hG9vr0peF") == true
        ) {
            //Unknown
            store.disableValue("FhHPxY16vet"); //Disease
            store.disableValue("gNM2Yhypydx"); //accident
            store.disableValue("wX3i3gkTG4m"); //Intentional self-harm
            store.disableValue("KsGOxFyzIs1"); //Assault
            store.disableValue("tYH7drlbNya"); //Legal intervention
            store.disableValue("xDMX2CJ4Xw3"); //War
            store.disableValue("b4yPk98om7e"); //Could not be determined
            store.disableValue("fQWuywOaoN2"); //Pending investigation
            //store.disableValue("o1hG9vr0peF");//Unknown
        }

        if (
            !allValues.FhHPxY16vet &&
            !allValues.gNM2Yhypydx &&
            !allValues.wX3i3gkTG4m &&
            !allValues.KsGOxFyzIs1 &&
            !allValues.tYH7drlbNya &&
            !allValues.xDMX2CJ4Xw3 &&
            !allValues.b4yPk98om7e &&
            !allValues.fQWuywOaoN2 &&
            !allValues.o1hG9vr0peF
        ) {
            store.enableValue("FhHPxY16vet"); //Disease
            store.enableValue("gNM2Yhypydx"); //accident
            store.enableValue("wX3i3gkTG4m"); //Intentional self-harm
            store.enableValue("KsGOxFyzIs1"); //Assault
            store.enableValue("tYH7drlbNya"); //Legal intervention
            store.enableValue("xDMX2CJ4Xw3"); //War
            store.enableValue("b4yPk98om7e"); //Could not be determined
            store.enableValue("fQWuywOaoN2"); //Pending investigation
            store.enableValue("o1hG9vr0peF"); //Unknown
        }

        if (
            changedValues.e96GB4CXyd3 &&
            changedValues.e96GB4CXyd3 === "SX01-02" &&
            form.getFieldValue("q7e7FOXKnOf") > 10 &&
            form.getFieldValue("q7e7FOXKnOf") < 50
        ) {
            console.log("WOMAN and old enough");
            if (personsGender === "Male") {
                setShowPregnancyReminder(false);
                setEnablePregnantQn(false);
                setEnablePregnantQnKey(`${parseInt(enablePregnantQnKey) + 1}`);
            } else {
                setShowPregnancyReminder(true);
                setEnablePregnantQn(true);
                setEnablePregnantQnKey(`${parseInt(enablePregnantQnKey) + 1}`);
                window.alert(
                    "Please Remember to fill in the section: For women, was the deceased pregnant or within 6 weeks of delivery?"
                );
            }
            //setEnablePregnantQn
        }

        if (changedValues.RbrUuKFSqkZ) {
            let years = moment().diff(changedValues.RbrUuKFSqkZ, "years");
            let hours = moment().diff(changedValues.RbrUuKFSqkZ, "hours");

            // set years when dob is selected
            form.setFieldsValue({ q7e7FOXKnOf: years });
            store.disableValue("q7e7FOXKnOf");

            if (years > 1) {
                store.disableValue("V4rE1tsj5Rb");
                store.disableValue("ivnHp4M4hFF");
                store.disableValue("jf9TogeSZpk");
                store.disableValue("xAWYJtQsg8M");
                store.disableValue("lQ1Byr04JTx");
                store.disableValue("DdfDMFW4EJ9");
                store.disableValue("GFVhltTCG8b");
            } else {
                store.enableValue("V4rE1tsj5Rb");
                store.enableValue("ivnHp4M4hFF");
                store.enableValue("jf9TogeSZpk");
                store.enableValue("xAWYJtQsg8M");
                store.enableValue("lQ1Byr04JTx");
                store.enableValue("DdfDMFW4EJ9");
                store.enableValue("GFVhltTCG8b");
            }

            if (hours < 24) {
                store.disableValue("jf9TogeSZpk");
            } else if (hours >= 24 && years <= 1) {
                store.enableValue("jf9TogeSZpk");
            }
        }

        // set other age fields
        if (changedValues.RbrUuKFSqkZ) {
            const dob = moment(changedValues.RbrUuKFSqkZ);
            const now = moment();

            let years = now.diff(dob, "years");
            dob.add(years, "years");

            let months = now.diff(dob, "months");
            dob.add(months, "months");

            let days = now.diff(dob, "days");

            form.setFieldsValue({
                q7e7FOXKnOf: years,   // years
                WYykJO0Vh3s: months,  // months
                v8mvHHXo06E: days     // days
            });

            store.disableValue("q7e7FOXKnOf");
            store.disableValue("WYykJO0Vh3s");
            store.disableValue("v8mvHHXo06E");
        }

        // If case number is prefixed with PERI or MATERNAL, set age to 0
        if (changedValues.ZKBE8Xm9DJG) {
            const caseNumber = changedValues.ZKBE8Xm9DJG;
            if (caseNumber && (caseNumber.includes("PERI") || caseNumber.includes("MATERNAL"))) {
                form.setFieldsValue({ q7e7FOXKnOf: 0 });
                setPersonsAge(0);
                store.disableValue("q7e7FOXKnOf");
            }
        }


        // if (changedValues.RbrUuKFSqkZ) {
        //     const dob = moment(changedValues.RbrUuKFSqkZ);
        //     const now = moment();
        //
        //     // const years = now.diff(dob, "years");
        //     const months = now.diff(dob, "months");
        //     const days = now.diff(dob, "days");
        //     const hours = now.diff(dob, "hours");
        //     const minutes = now.diff(dob, "minutes");
        //
        //     form.setFieldsValue({
        //         // q7e7FOXKnOf: years,
        //         WYykJO0Vh3s: months,
        //         v8mvHHXo06E: days,
        //         // VJXpmHCaAFG: hours,
        //         // TgFI46omIEg: minutes
        //     });
        //
        //     store.disableValue("q7e7FOXKnOf");
        //     // Optionally disable other age fields
        // }


        if (changedValues.q7e7FOXKnOf !== undefined) {
            const ageYears = Number(changedValues.q7e7FOXKnOf);
            if (ageYears < 1) {
                message.warning("Please fill the fetal or infant section");
            }
        }

        // console.log("clear working");
        if (changedValues.sfpqAeqKeyQ) {
            form.setFieldsValue({ zD0E77W4rFs: null });
            console.log("clear working");
        }

        if (changedValues.i8rrl8YWxLF) {
            if (
                form.getFieldValue("RbrUuKFSqkZ") &&
                changedValues.i8rrl8YWxLF.isBefore(
                    form.getFieldValue("RbrUuKFSqkZ")
                )
            ) {
                console.log("SETTING DATE OF DEATH TO NULL");
                form.setFieldsValue({ i8rrl8YWxLF: null });
            }
        }

        // if (changedValues.jY3K6Bv4o9Q && changedValues.jY3K6Bv4o9Q !== "YN01-01") {
        //   store.disableValue("UfG52s4YcUt");
        // } else if (
        //   changedValues.jY3K6Bv4o9Q &&
        //   changedValues.jY3K6Bv4o9Q === "YN01-01"
        // ) {
        //   store.enableValue("UfG52s4YcUt");
        // }

        if (changedValues.Ylht9kCLSRW) { //
            store.enableValue("WkXxkKEJLsg"); //time interval
            console.log("A changed. enable B");
            store.enableValue("zb7uTuBCPrN");
        }

        if (changedValues.sfpqAeqKeyQ) { // cause A
            console.log("A changed. enable B");
            store.enableValue("zb7uTuBCPrN");
        }

        if (changedValues.zb7uTuBCPrN)
            store.enableValue("QGFYJK00ES7");

        if (changedValues.QGFYJK00ES7)
            store.enableValue("CnPGhOcERFF")

        if (changedValues.WkXxkKEJLsg) {
            store.enableValue("zb7uTuBCPrN"); // cause b
            store.enableValue("QTKk2Xt8KDu");
        }

        if (changedValues.myydnkmLfhp) { // time inteval b
            store.enableValue("fleGy9CvHYh"); // ti b
        }

        if (changedValues.fleGy9CvHYh) {  // ti b
            store.enableValue("QGFYJK00ES7"); // cause c
        }

        if (changedValues.aC64sB86ThG) {
            store.enableValue("hO8No9fHVd2");
        }

        if (changedValues.hO8No9fHVd2) {
            store.enableValue("CnPGhOcERFF");
        }

        if (changedValues.cmZrrHfTxW3) {
            store.enableValue("eCVDO6lt4go");
        }

        if (changedValues.eCVDO6lt4go) {
            store.enableValue("QTKk2Xt8KDu");
        }

        if (changedValues.AZSlwlRAFig) {
            store.enableValue("DKlOhZJOCrX");
            store.enableValue("kGIDD5xIeLC");
        } else if (!allValues.AZSlwlRAFig) {
            store.disableValue("DKlOhZJOCrX");
            store.disableValue("kGIDD5xIeLC");
        }

        if (changedValues.FhHPxY16vet) {
            store.disableValue("DKlOhZJOCrX");
            store.disableValue("kGIDD5xIeLC");
            store.disableValue("AZSlwlRAFig");
        } else if (!allValues.FhHPxY16vet) {
            store.enableValue("AZSlwlRAFig");
        }

        if (changedValues.U18Tnfz9EKd) {
            if (
                (form.getFieldValue("RbrUuKFSqkZ") &&
                    form.getFieldValue("i8rrl8YWxLF") &&
                    changedValues.U18Tnfz9EKd.isBefore(
                        form.getFieldValue("RbrUuKFSqkZ")
                    )) ||
                changedValues.U18Tnfz9EKd.after(
                    form.getFieldValue("i8rrl8YWxLF")
                )
            ) {
                form.setFieldsValue({ U18Tnfz9EKd: null });
            }
        }

        if (
            changedValues.ivnHp4M4hFF &&
            (changedValues.ivnHp4M4hFF === "YN01-01" ||
                changedValues.ivnHp4M4hFF === "YN01-03")
        ) {
            store.enableValue("jf9TogeSZpk");
        } else {
            store.disableValue("jf9TogeSZpk");
        }

        // if (changedValues.zcn7acUB6x1 && changedValues.zcn7acUB6x1 !== "YN01-01") {
        //   store.disableValue("KpfvNQSsWIw");
        //   store.disableValue("AJAraEcfH63");
        //   store.disableValue("RJhbkjYrODG");
        //   store.disableValue("ymyLrfEcYkD");
        //   store.disableValue("K5BDPJQk1BP");
        //   store.disableValue("Z41di0TRjIu");
        //   store.disableValue("uaxjt0inPNF");
        // } else if (changedValues.zcn7acUB6x1 === "YN01-01") {
        //   store.enableValue("KpfvNQSsWIw");
        //   store.enableValue("AJAraEcfH63");
        //   store.enableValue("RJhbkjYrODG");
        //   store.enableValue("ymyLrfEcYkD");
        //   store.enableValue("K5BDPJQk1BP");
        //   store.enableValue("Z41di0TRjIu");
        //   store.enableValue("uaxjt0inPNF");
        // }

        if (
            changedValues.e96GB4CXyd3 &&
            changedValues.e96GB4CXyd3 !== "SX01-02"
        ) {
            // store.disableValue("zcn7acUB6x1");
            // store.disableValue("KpfvNQSsWIw");
            // store.disableValue("AJAraEcfH63");
            // store.disableValue("RJhbkjYrODG");
            // store.disableValue("ymyLrfEcYkD");
            // store.disableValue("K5BDPJQk1BP");
            // store.disableValue("Z41di0TRjIu");
            // store.disableValue("uaxjt0inPNF");
        } else if (
            changedValues.e96GB4CXyd3 &&
            changedValues.e96GB4CXyd3 === "SX01-02"
        ) {
            store.enableValue("zcn7acUB6x1");
            console.log("sex female");
            var x = form.getFieldValue("q7e7FOXKnOf");
            console.log(x);
        }

        if (
            changedValues.Kk0hmrJPR90 &&
            changedValues.Kk0hmrJPR90 !== "YN01-01"
        ) {
            store.disableValue("j5TIQx3gHyF");
            store.disableValue("JhHwdQ337nn");
            // store.disableValue("jY3K6Bv4o9Q");
            // store.disableValue("UfG52s4YcUt");
        } else {
            store.enableValue("j5TIQx3gHyF");
            store.enableValue("JhHwdQ337nn");
            // store.enableValue("jY3K6Bv4o9Q");
            // store.enableValue("UfG52s4YcUt");
        }

        // if (changedValues.jY3K6Bv4o9Q && changedValues.jY3K6Bv4o9Q !== "YN01-01") {
        //   store.disableValue("UfG52s4YcUt");
        // } else {
        //   store.enableValue("UfG52s4YcUt");
        // }

        if (changedValues.j5TIQx3gHyF && form.getFieldValue("i8rrl8YWxLF")) {
            let weeks = moment(form.getFieldValue("i8rrl8YWxLF")).diff(
                changedValues.RbrUuKFSqkZ,
                "weeks"
            );
            if (weeks > 4) {
                form.setFieldsValue({ j5TIQx3gHyF: null });
            }
        }

        // console.log("Changed value is ", changedValues);

        // console.log("working");
    };

    const ninapi = useNinApi();

    const fetchAndFillUserInfo = (nin: string) => {
        ninapi.getNINPerson(nin)
            .then((data: any) => {
                const info = data.data;
                console.log("NIN info", data);

                // Disable all form fields except residence details
                const allFormFields = form.getFieldsValue();
                const residenceFields = ['zwKo51BEayZ', 'u44XP9fZweA', 't5nTEmlScSt']; // region, district, village IDs

                Object.keys(allFormFields).forEach(fieldName => {
                    if (!residenceFields.includes(fieldName)) {
                        store.disableValue(fieldName);
                    }
                });


                // Keep residence fields enabled
                residenceFields.forEach(field => {
                    store.enableValue(field);
                });

                if (!isEmpty(info) && !info.error) {
                    // full name
                    form.setFieldsValue({ ZYKmQ9GPOaF: `${info?.givenNames} ${info?.surname}` });
                    store.disableValue("ZYKmQ9GPOaF")
                    // e96GB4CXyd3 sex
                    let sex = "";
                    if (info?.gender == "M")
                        sex = "Male";
                    else if (info?.gender == "F")
                        sex = "Female";
                    form.setFieldsValue({ e96GB4CXyd3: sex });
                    setPersonsGender(sex);
                    if (!!sex)
                        store.disableValue("e96GB4CXyd3")
                    // roxn33dtLLx dob known ageKnown
                    form.setFieldsValue({ roxn33dtLLx: true })
                    store.disableValue("roxn33dtLLx")
                    // RbrUuKFSqkZ dateOfBirth
                    let dob = moment(info?.dateOfBirth, "DD/MM/YYYY");
                    form.setFieldsValue({ RbrUuKFSqkZ: dob })
                    if (!!dob) store.disableValue("RbrUuKFSqkZ")

                    // q7e7FOXKnOf age
                    let years = moment().diff(dob, "years");
                    form.setFieldsValue({ q7e7FOXKnOf: years });
                    setPersonsAge(years);

                    if (!!years) store.disableValue("q7e7FOXKnOf");

                    if (sex === "Male") {
                        setShowPregnancyReminder(
                            false
                        );
                        setEnablePregnantQn(false);
                        setEnablePregnantQnKey(
                            `${parseInt(
                                enablePregnantQnKey
                            ) + 1
                            }`
                        );
                        return;
                    }

                    if (sex === "Female" && years < 50 && years > 10) {
                        setShowPregnancyReminder(true);
                        setEnablePregnantQn(true);
                        setEnablePregnantQnKey(
                            `${parseInt(
                                enablePregnantQnKey
                            ) + 1
                            }`
                        );
                        window.alert(
                            activeLanguage.lang[
                            "Please Remember to fill in the section: For women, was the deceased pregnant or within 6 weeks of delivery?"
                            ]
                        );
                    }

                } else {

                    if (info.error && !(info.error.code == 320)) {
                        notification.error({
                            message: 'Error fetching NIN information',
                            description: info.error.message ?? info.error
                            // onClick: () => {
                            //   console.log('Notification Clicked!');
                            // },
                        });
                    } else {
                        notification.error({
                            message: 'NIN Not Found',
                            description:
                                'The NIN was not found in system. Double Check for any mistakes',
                            // onClick: () => {
                            //   console.log('Notification Clicked!');
                            // },
                        });
                    }
                }

            })
            .catch((error) => {
                console.error('Error fetch user:', error);
            });

        ninapi.getNINPlaceOfBirth(nin)
            .then(async (data: any) => {


                console.log("apiAddr", data.data)
                if (!isEmpty(data.data) && !data.data.error) {


                    const apiSubCounty = data.data.address?.subCounty;
                    const apiDistrict = data.data.address?.district;

                    const query = {
                        district: {
                            resource: `organisationUnits.json`,
                            params: {
                                filter: `name:ilike:${apiDistrict}`,
                                level: 3,
                                paging: "false",
                                fields: "id,name,displayName,parent[id,name,displayName],children[id,name,displayName]",
                            },
                        },
                    };

                    const sysData = await store.engine.query(query);

                    console.log("loaddistrict:", sysData);

                    const district = sysData.district.organisationUnits?.[0];

                    console.log("district", district)

                    if (!!district) {
                        const region: any = district.parent;
                        console.log("region", region)
                        let matches = {};
                        const tokens = apiSubCounty.toLowerCase().split(" ");
                        district.children.forEach(sb => {
                            tokens.forEach(t => {
                                if (sb.name.toLowerCase().indexOf(t) >= 0) {
                                    if (!matches[sb.id])
                                        matches[sb.id] = { ...sb, count: 0 };
                                    matches[sb.id].count += 1;
                                }
                            })
                        });

                        const subCounty: any = Object.values(matches)?.sort((a: any, b: any) => b.count - a.count)[0];
                        console.log("subCounty", subCounty)
                        // zwKo51BEayZ region  chosenRegion
                        setChosenRegionToSubmit(region.displayName);
                        setChosenRegion(region.displayName)
                        form.setFieldsValue({
                            zwKo51BEayZ: region.displayName
                        })
                        if (!!region) store.disableValue("zwKo51BEayZ")

                        // district
                        setChosenDistrict(district.displayName)
                        setChosenDistrictToSubmit(district.displayName)
                        form.setFieldsValue({ u44XP9fZweA: district.displayName });
                        store.disableValue("u44XP9fZweA")

                        //  subCounty chosenSubCounty
                        setChosenSubcounty(subCounty.displayName)
                        form.setFieldsValue({ t5nTEmlScSt: subCounty.displayName });
                        if (!!subCounty) store.disableValue("t5nTEmlScSt")

                    }
                    // dsiwvNQLe5n Village
                    form.setFieldsValue({ dsiwvNQLe5n: data.data.address?.village });
                    store.disableValue("dsiwvNQLe5n")


                    // xNCSFrgdUgi place of death
                    // form.setFieldsValue({xNCSFrgdUgi: data.data.address?.parish}); turn off auto set
                    store.disableValue("xNCSFrgdUgi")

                    //se3wRj1bYPo County
                    form.setFieldsValue({ se3wRj1bYPo: data.data.address?.county });
                    store.disableValue("se3wRj1bYPo")


                    //i8rrl8YWxLF dateOfDeath
                }

            })
            .catch((error) => {
                console.error('Error fetch user:', error);
            });
    }

    const optionSet = (
        os: string,
        field: string,
        optionalFunction?: Function,
        disabled?: boolean,
        optionalKey?: string
    ) => {

        let options = optionSets ? optionSets[os] : [];
        console.log("debugg", options, os)
        if (options) {
            return (
                <Select
                    style={{ width: "100%" }}
                    size="large"
                    disabled={
                        store.viewMode || store.allDisabled[field] || disabled
                    }
                    key={optionalKey || field}
                    onChange={
                        (e: any) => {
                            // Let rc-field-form update the state natively, then force validation clear
                            setTimeout(() => {
                                form.validateFields([field]).catch(() => {});
                            }, 0);
                            
                            if (optionalFunction) {
                                optionalFunction(e);
                            }
                        }
                    }
                >
                    {options.filter(o => !!o).map((option: any) => (
                        <Option key={option.code || option.id} value={option.code || option.name}>
                            {option.name}
                        </Option>
                    ))}
                </Select>
            );
        }
        return null;
    };

    // Testing
    const toggleEnableAltSearch = (id: any, value: boolean) => {
        let inputID = id;
        let inputValue = value;

        let newValues = altSearchIsDisabled;
        newValues[inputID] = inputValue;
        setAltSearchIsDisabled(newValues);
    };

    const editUnderlyingCauses = (
        id: string,
        value: string,
        diseaseTitle?: string,
        uri?: string
    ) => {
        let inputID = id;
        let inputValue = value;

        let newValues = underlyingCauses;
        newValues[inputID] = inputValue;
        if (diseaseTitle) {
            newValues["diseaseTitle" + id.toUpperCase()] = diseaseTitle;
        }
        if (uri) {
            newValues["diseaseURI" + id.toUpperCase()] = uri;
        }
        setUnderlyingCauses(newValues);

        let mainCause = "";

        if (!!newValues["d"]) {
            mainCause = newValues["d"];
        } else if (!!newValues["c"]) {
            mainCause = newValues["c"];
        } else if (!!newValues["b"]) {
            mainCause = newValues["b"];
        } else if (!!newValues["a"]) {
            mainCause = newValues["a"];
        }

        addDiseaseTitle(mainCause);

        console.log("editUnderlyingCauses...", newValues);
        console.log("mainCause", mainCause);
        console.log("underlyingCauseText...", underlyingCauseText);
    };

    const setDorisFields = async () => {
        console.log("underlying causes", underlyingCauses);

        const intervalAType = form.getFieldValue("Ylht9kCLSRW");
        const intervalAVal = form.getFieldValue("WkXxkKEJLsg");
        const intervalA = (!!intervalAType && !!intervalAVal) ? moment.duration({ [intervalAType]: intervalAVal }).toISOString() : null;

        const intervalBType = form.getFieldValue("myydnkmLfhp");
        const intervalBVal = form.getFieldValue("fleGy9CvHYh");
        const intervalB = (!!intervalBType && !!intervalBVal) ? moment.duration({ [intervalBType]: intervalBVal }).toISOString() : null;

        const intervalCType = form.getFieldValue("aC64sB86ThG");
        const intervalCVal = form.getFieldValue("hO8No9fHVd2");
        const intervalC = (!!intervalCType && !!intervalCVal) ? moment.duration({ [intervalCType]: intervalCVal }).toISOString() : null;

        const intervalDType = form.getFieldValue("cmZrrHfTxW3");
        const intervalDVal = form.getFieldValue("eCVDO6lt4go");
        const intervalD = (!!intervalDType && !!intervalDVal) ? moment.duration({ [intervalDType]: intervalDVal }).toISOString() : null;

        const dateOfDeath = moment(actualTimeOfDeath);
        const ageOfIndividual = form.getFieldValue("q7e7FOXKnOf");
        const dateOfBirth = form.getFieldValue("RbrUuKFSqkZ");
        const wasPregnant = form.getFieldValue("zcn7acUB6x1");
        const pregnacyContribute = form.getFieldValue("AJAraEcfH63")
        const pregTime = form.getFieldValue("KpfvNQSsWIw");
        const others = [
            {
                code: form.getFieldValue("ctbKSNV2cg7"),
                uri: form.getFieldValue("T4uxg60Lalw"),
            },
            {
                code: form.getFieldValue("krhrEBwJeNC"),
                // uri: form.getFieldValue("T4uxg60Lalw"),
            },
            {
                code: form.getFieldValue("ZKtS7L49Poo"),
                // uri: form.getFieldValue("T4uxg60Lalw"),
            },
            {
                code: form.getFieldValue("fJDDc9mlubU"),
                // uri: form.getFieldValue("T4uxg60Lalw"),
            },
            {
                code: form.getFieldValue("z89Wr84V2G6"),
                // uri: form.getFieldValue("T4uxg60Lalw"),
            }
        ];

        console.log("others obj", others)

        const otherCodes = others
            .filter(item => item.code)
            .map(item => item.code)
            .join(',');

        const otherUris = others
            .filter(item => item.code)
            .map(item => item.code)
            .join(',');

        const payload = {
            sex: (personsGender == "Male" || personsGender == "SX01-01") ? "1"
                : (personsGender == "Female" || personsGender == "SX01-02") ? "2"
                    : "9",
            // estimatedAge // Provided in ISO_8601 format https://en.wikipedia.org/wiki/ISO_8601#Durations.
            // E.g. P10YD 10 years, P9M 9 months, P5D 5 days, PT10H 10 hours, PT10M 10 minutes
            estimatedAge: personsAge ? moment.duration({ years: personsAge }).toISOString() : "",
            causeOfDeathCodeA: underlyingCauses["diseaseTitleA"],
            causeOfDeathCodeB: underlyingCauses["diseaseTitleB"],
            causeOfDeathCodeC: underlyingCauses["diseaseTitleC"],
            causeOfDeathCodeD: underlyingCauses["diseaseTitleD"],
            causeOfDeathCodePart2: otherCodes,
            causeOfDeathUriPart2: otherUris,
            intervalA,
            intervalB,
            intervalC,
            intervalD,
            dateBirth: dateOfBirth?.toISOString() ?? "",
            dateDeath: dateOfDeath?.toISOString() ?? "",
            // maternalDeathWasPregnant
            // For women, was the deceased pregnant 0: No, - 1: Yes, - 9: Unknown
            maternalDeathWasPregnant: wasPregnant == "Yes" ? "1" : wasPregnant == "No" ? "0" : "9",
            // maternalDeathPregnancyContribute
            // Did pregnancy contribute to death 0: No, - 1: Yes, - 9: Unknown
            maternalDeathPregnancyContribute: pregnacyContribute == "Yes" ? "1" : pregnacyContribute == "No" ? "0" : "9",
            // timeFromPregnancy
            // 1: Within 42 days before death - 2: Between 43 days up to 1 year before death - 9:Unknown
            timeFromPregnancy: pregTime == "Within 42 days before the death" ? "1" : pregTime == "Between 43 days up to 1 year before death" ? "2" : "9",

        };
        // "https://icd.who.int/doris/api/ucod/underlyingcauseofdeath/ICD11"
        const burl = "https://hmis-dev.health.go.ug";
        // const burl = "https://hmis-tests.health.go.ug";
        const url = burl + "/icd/release/11/2024-01/doris?" + new URLSearchParams(payload);
        
        try {
            const res = await fetch(url, {
                // body: JSON.stringify(payload),
                method: 'GET',
                headers: {
                    "Content-Type": "application/json",
                    "API-Version": "v2",
                    "Accept-Language": "en",
                }
            }).then((response) => {
                if (!response.ok) throw new Error("Doris API failed with status " + response.status);
                return response.json();
            });

            const nameres = await fetch(
                res.uri.replace("http://id.who.int", "https://hmis-dev.health.go.ug"),
                {
                    method: 'GET',
                    headers: {
                        "Content-Type": "application/json",
                        "API-Version": "v2",
                        "Accept-Language": "en",
                    }
                }).then((response) => {
                    if (!response.ok) throw new Error("ICD API failed with status " + response.status);
                    return response.json();
                });

            console.log("resd", res);
            form.setFieldsValue({
                tKezaEs8Ez5: nameres?.title["@value"],
                LAvyxs29laJ: res.code,
                mQVAyOLbga1: nameres?.title["@value"],  //for Final Underlying Cause
                n2mScmFMovq: res.code    //for Final Underlying Cause

            })
            setDorisValue({
                code: res.code,
                text: nameres?.title["@value"]
            });
            
            let reportText = res.report;
            if (!reportText && (res.error || res.warning)) {
                reportText = [
                    res.error ? `Error: ${res.error}` : "",
                    res.warning ? `Warning: ${res.warning}` : ""
                ].filter(Boolean).join("\n\n");
            }
            setDorisReport(reportText || "No computation report available.");
        } catch (error) {
            console.error("Failed to fetch Doris fields:", error);
            // Optionally clear or set error state if needed
        }
    }

    const addDiseaseTitle = (val: string) => {
        let keys = Object.keys(underlyingCauses);
        let titleToAdd = "";
        let uriToAdd = "";

        setDorisFields();
        console.log("Inside addDiseaseTitle, val =>", val);
        keys.forEach((item) => {
            if (
                underlyingCauses[item] === val &&
                item.includes("disease") === false
            ) {
                console.log(
                    "\n underlyingCauses[item] IS",
                    underlyingCauses[item]
                );
                console.log(
                    "\n diseaseTitle[item] IS",
                    underlyingCauses["diseaseTitle" + item.toUpperCase()],
                    "\n\n"
                );
                titleToAdd =
                    underlyingCauses["diseaseTitle" + item.toUpperCase()];
                uriToAdd = underlyingCauses["diseaseURI" + item.toUpperCase()];
            }
        });
        console.log("\n\n Adding URI of ", uriToAdd, "\n\n");
        console.log("UCT", val);

        // This Updates the problematic field Next to State underlying cause
        // console.log("Val is ", val)
        // setUnderlyingCauseText(val.includes(")") ? val.split(")")[1].trim() : val);
        setUnderlyingCauseText(val);
        setUnderlyingCauseCode(titleToAdd);
        setUnderlyingCauseURI(uriToAdd);
        setUnderlyingCauseChosen(true);
        // console.log("\n\nCause (underlying):", titleToAdd, "\n\n");
        form.setFieldsValue({
            dTd7txVzhgY: titleToAdd,
        });
        // End of update
    };
    // End of Testing

    const styles = {
        flexRow: {
            display: "flex" as "flex",
            justifyContent: "space-between",
            paddingLeft: "1.5rem",
            paddingRight: "1.5rem",
            alignItems: "center",
            // transform: "scale(0.8)",
        },
    };

    const handleUpdateApproval = (update: any) => {
        console.log("Update received as ", update);
        setApprovalStatus(update);

        // Force ant design to acknowledge the changed value
    };


    useEffect(() => {
        // console.log("j5TIQx3gHyF is ", store.defaultValues.j5TIQx3gHyF);
        console.log("defaultValues: ", store.defaultValues);
        // form.setFieldsValue({"eventDate": moment()})
        let defaults = store.defaultValues;

        const mcodtemp = localStorage.getItem("mcodtemp");
        if (!!mcodtemp) {
            setFromReview(true);
            // form.setFieldsValue({ CPq2mkKL98T: "hmis 020" });

            const lsdefaults = JSON.parse(mcodtemp);
            Object.keys(lsdefaults).filter(k => !["nationality", "orgUnit"].includes(k)).forEach(key => {
                defaults[mcodmap[key]] = lsdefaults[key];

                if (key === "iJqBq0kQtWO" && !!lsdefaults[key]) {
                    setAgeKnown(false);
                    form.setFieldsValue({
                        roxn33dtLLx: "No",
                    });
                } else if (key === "iJqBq0kQtWO" && !lsdefaults[key]) {
                    delete defaults[mcodmap[key]];
                }

                if (key === "dob" && !!lsdefaults[key]) {
                    const _dob = moment(lsdefaults[key]);
                    form.setFieldsValue({
                        RbrUuKFSqkZ: _dob,
                    });
                }


                if (dateFields.indexOf(mcodmap[key]) !== -1 && !!lsdefaults[key]) {
                    defaults[mcodmap[key]] = moment(lsdefaults[key]);
                }

                if (mcodmap[key] === "jY3K6Bv4o9Q")
                    defaults[mcodmap[key]] = lsdefaults[key] === "true" ? "Yes" : "No";
                // else if (value === "true") {
                // 	value = true;
                // } else if (value === "false") {
                // 	value = false;
                // }
            })

            console.log("clean defaults", defaults)
            form.setFieldsValue({ e96GB4CXyd3: "Female" })
            if (!lsdefaults['q7e7FOXKnOf'] && !!lsdefaults["perinatal"]) {
                setPersonsAge(0);
                defaults['q7e7FOXKnOf'] = 0;
            }
            setPersonsGender("Female");
            localStorage.removeItem("mcodtemp")

        }

        // Pre-fill Given Name from Full Name if Given Name is empty
        if (defaults && defaults["ZYKmQ9GPOaF"] && !defaults["QmcOqkcNTip"]) {
            defaults["QmcOqkcNTip"] = defaults["ZYKmQ9GPOaF"];
        }

        form.setFieldsValue(defaults)
        // setTestVal(defaults["cSDJ9kSJkFP"] as string);
        // setTestVal2(defaults["uckvenVFnwf"] as string);
        // setTestVal3(defaults["ZFdJRT3PaUd"] as string);
        // setTestVal4(defaults["Op5pSvgHo1M"] as string);


        console.log({ defaults });
        if (Object.keys(defaults).length) {
            setEditing(true);
            // Auto-populate form if it is an existing form being edited
            if (defaults["QTKk2Xt8KDu"]) {
                setUnderlyingCauseText(`${defaults["QTKk2Xt8KDu"]}`);
            }

            setDefaultUCause((s) => ({
                sfpqAeqKeyQ: defaults["sfpqAeqKeyQ"] || s.sfpqAeqKeyQ,
                zb7uTuBCPrN: defaults["zb7uTuBCPrN"] || s.zb7uTuBCPrN,
                QGFYJK00ES7: defaults["QGFYJK00ES7"] || s.QGFYJK00ES7,
                CnPGhOcERFF: defaults["CnPGhOcERFF"] || s.CnPGhOcERFF,
            }))


            if (defaults["sJhOdGLD5lj"]) {
                setUnderlyingCauseCode(`${defaults["sJhOdGLD5lj"]}`);
            }
            if (defaults["t5nTEmlScSt"]) {
                setChosenSubcounty(`${defaults["t5nTEmlScSt"]}`);
            }
            if (defaults["u44XP9fZweA"]) {
                setChosenDistrict(`${defaults["u44XP9fZweA"]}`);
            }
            if (defaults["QDHeWslaEoH"]) {
                setChosenFacility(`${defaults["QDHeWslaEoH"]}`);
            }
            setUnderlyingCauseChosen(true);
            if (defaults["e96GB4CXyd3"]) {
                setPersonsGender(`${defaults["e96GB4CXyd3"]}`);
            }
            if (defaults["q7e7FOXKnOf"]) {
                setPersonsAge(Number(`${defaults["q7e7FOXKnOf"]}`));
            }
            if (defaults["zwKo51BEayZ"]) {
                setChosenRegion(`${defaults["zwKo51BEayZ"]}`);
            }
            // setChosenFacility(`${defaults["referredValueSavedHere"]}`);
            if (defaults["q7e7FOXKnOf"]) {
                form.setFieldsValue({
                    q7e7FOXKnOf: Number(`${defaults["q7e7FOXKnOf"]}`),
                });
                // console.log("Chosen district is =>", defaults);
            }

            if (defaults["twVlVWM3ffz"]) {
                setApprovalStatusFromEditedForm(
                    `${defaults["twVlVWM3ffz"]}`
                );
            }

            if (defaults["lu9BiHPxNqH"]) {
                setDeclarationsDefault({
                    u9tYUv6AM51: !!defaults["u9tYUv6AM51"],
                    ZXZZfzBpu8a: !!defaults["ZXZZfzBpu8a"],
                    cp5xzqVU2Vw: !!defaults["cp5xzqVU2Vw"],
                    lu9BiHPxNqH: `${defaults["lu9BiHPxNqH"]}`,
                });
            } else {
                setDeclarationsDefault({
                    u9tYUv6AM51: !!defaults["u9tYUv6AM51"],
                    ZXZZfzBpu8a: !!defaults["ZXZZfzBpu8a"],
                    cp5xzqVU2Vw: !!defaults["cp5xzqVU2Vw"],
                    lu9BiHPxNqH: "",
                });
            }
        } else {
            // creating new event
            store.engine.link.fetch('/api/33/system/id.json').then(({ codes }) => {
                form.setFieldsValue({ ZKBE8Xm9DJG: codes[0] })
                store.disableValue("ZKBE8Xm9DJG");
            })
        }
    }, [store.defaultValues]);

    useEffect(() => {
        // setActiveLanguage(allLanguages[0]);
        // setActiveLanguageString(allLanguages[0].langName);
        // store.setActiveLanguage(allLanguages[0]);
        // fetchNINToken(store.engine);
        store.apiStore.fetchNINToken();
    }, []);

    useEffect(() => {
        handleEstimateAge();
    }, [ageKnown]);

    useEffect(() => {
        console.log("This is ", actualTimeOfDeath);
        handleEstimateAge();
    }, [actualTimeOfDeath]);

    useEffect(() => {
        if (forceResetDOB) {
            setTimeout(() => {
                console.log("LINE 874: time of Death =>", actualTimeOfDeath);
                console.log("LINE 880: time of Birth =>", actualTimeOfDeath);
                console.log("LINE 884: Age =>", actualTimeOfDeath);
                handleEstimateAge();
                setForceResetDOB(false);
            }, 10);
        }
    }, [forceResetDOB]);

    // add field

    // add row state
    const [customRowLength, setCustomRowLength] = React.useState(0);
    const [creatingCustomField, setCreatingFiled] = React.useState(false);
    const [customFieldName, setCustomFieldName] = React.useState("");
    // const usedCustomIds = React.useRef(
    //   Object.fromEntries(
    //     customFieldsReservedIds.map(({ id }) => [id, false])
    //   )
    // );

    // const customRowsRef = React.useRef(
    //   [] as { name: string; id: string | null }[]
    // );

    const createDataElement = async (name: string) => {
        const attachPayload = {
            aggregationType: "NONE",
            code: `${customFieldName}`,
            domainType: "TRACKER",
            valueType: "TEXT",
            name: customFieldName,
            shortName: `${customFieldName}`,
            categoryCombo: {
                id: "bjDvmb4bfuf",
            },
            legendSets: [] as any,
        };

        await store.engine.link.fetch(`/api/29/schemas/dataElement`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `${process.env.REACT_APP_DHIS2_AUTHORIZATION}`,
            },
            body: JSON.stringify(attachPayload),
        });

        const res = await store.engine.link
            .fetch(`/api/29/dataElements`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `${process.env.REACT_APP_DHIS2_AUTHORIZATION}`,
                },
                body: JSON.stringify(attachPayload),
            })
            .catch((err: any) => {
                console.log(err);
            });

        console.log("res", res.response);
        return res.response?.uid;
    };

    const [customRows, setCustomRows] = React.useState(
        [] as { name: string; id: string | null }[]
    );

    const checkAttributesNamespaceExists = async () => {
        if (store.attributesExist == null)
            await store.checkAttributesNamespaceExists();
    };

    React.useEffect(() => {
        console.log("customRowLength", customRowLength);

        checkAttributesNamespaceExists().then(() => {
            store.engine.link
                .fetch(`/api/dataStore/Attributes/Attributes`)
                .then((res: any) => {
                    console.log("CustomRows", res);

                    if (!res || JSON.stringify(res) == "{}") {
                        setCustomRows([]);
                        setCustomRowLength(0);
                    } else {
                        // console.log(res);
                        setCustomRows(res);
                        setCustomRowLength(res.length);
                        // const keys = Object.keys(usedCustomIds.current);
                        // Object.keys(usedCustomIds.current).forEach((id: any) => {
                        //   usedCustomIds.current[id] = false;
                        // });
                        // // console.log(usedCustomIds.current);
                        // res.forEach((row: { id: string }) => {
                        //   if (keys.includes(row.id)) {
                        //     usedCustomIds.current[row.id] = true;
                        //   }
                        // });
                        // console.log(usedCustomIds.current);
                    }
                })
                .catch((error: any) => {
                    console.log(error);
                });
        });
    }, [customRowLength]);

    // React.useEffect(() => {
    //   if (customRowLength > 0) {
    //     console.log(customRowLength);
    //     const newArray = [...customRowsRef.current];
    //     newArray.push({ name: customFieldName, id: null });
    //     customRowsRef.current = [...newArray];
    //     setCustomRows(customRowsRef.current);
    //   }
    // }, [customFieldName, customRowLength]);

    const [fetching, setFetching] = React.useState(false);
    const [deleting, setDeleting] = React.useState(false);
    // console.log(process.env.REACT_APP_DHIS2_AUTHORIZATION);
    React.useEffect(() => {
        if (fetching) {
            if (
                customRows.find(({ name }) => {
                    return name.toLowerCase() === customFieldName.toLowerCase();
                })
            ) {
                alert(`${customFieldName} Already exists`);
                setFetching(false);
                return;
            }
            // console.log(usedCustomIds.current)
            // find first unused
            // let idx = Object.keys(usedCustomIds.current).findIndex((k)=>{
            //   // console.log(usedCustomIds.current[k])
            //   return !usedCustomIds.current[k];
            // })
            // // console.log(idx);
            // idx = idx > -1 ? idx : 0;
            // let field = { ...customRows[idx] };
            // // console.log(customRowLength);
            // // console.log(customFieldsReservedIds[idx]);

            // field.id = customFieldsReservedIds[idx].id;
            // usedCustomIds.current[field.id] = true;

            // const attachPayload = {
            //   aggregationType: "NONE",
            //   code: customFieldName,
            //   domainType: "TRACKER",
            //   // publicAccess: "rw------",
            //   // lastUpdated: "2021-10-06T13:41:20.427",
            //   valueType: "TEXT",
            //   formName: customFieldName,
            //   id: field.id,
            //   // created: "2021-10-06T11:38:18.755",
            //   // attributeValues: [],
            //   // zeroIsSignificant: false,
            //   name: customFieldName,
            //   shortName: customFieldName,
            //   categoryCombo: { id: "bjDvmb4bfuf" },
            //   // lastUpdatedBy: { id: "M5zQapPyTZI" },
            //   // user: { id: "M5zQapPyTZI" },
            //   // translations: [],
            //   // userGroupAccesses: [],
            //   // userAccesses: [],
            //   // legendSets: [],
            //   // aggregationLevels: [],
            // };

            createDataElement(customFieldName)
                .then(async (uid: any) => {
                    console.log(uid);
                    if (uid) {
                        const prog = await store.engine.link.fetch(
                            `/api/programs/${store.program}?fields=programStages[allowGenerateNextVisit,publicAccess,lastUpdated,id,generatedByEnrollmentDate,created,attributeValues,name,hideDueDate,enableUserAssignment,minDaysFromStart,executionDateLabel,preGenerateUID,openAfterEnrollment,repeatable,remindCompleted,displayGenerateEventBox,validationStrategy,autoGenerateEvent,blockEntryForm,dataEntryForm,programStageDataElements,program,lastUpdatedBy,user,programStageDataElements[created,lastUpdated,id,displayInReports,skipSynchronization,renderOptionsAsRadio,compulsory,allowProvidedElsewhere,sortOrder,allowFutureDate,programStage,dataElement[id,domainType,displayName,valueType]],translations,userGroupAccesses,userAccesses,notificationTemplates,programStageSections]`
                        );

                        let stages = prog.programStages[0];
                        const stageId = stages?.id;
                        const dEs = stages?.programStageDataElements;

                        dEs.push({
                            id: customFieldsReservedIds[customRowLength].id,
                            dataElement: {
                                id: uid,
                                displayName: customFieldName,
                                valueType: "TEXT",
                            },
                            programStage: {
                                id: stageId,
                            },
                            sortOrder: dEs.length + 1,
                        });

                        stages.programStageDataElements = dEs;

                        const payload = prog.programStages;
                        payload[0] = stages;
                        console.log("Stages", payload);

                        store.engine.link
                            .fetch("/api/29/metadata", {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                    programStages: payload,
                                }),
                            })
                            .catch((err: any) => {
                                setFetching(false);
                                console.log("Error", err);
                            })
                            .then(() => {
                                const dataElement = {
                                    aggregationType: "NONE",
                                    domainType: "TRACKER",
                                    valueType: "TEXT",
                                    name: customFieldName,
                                    shortName: uid,
                                    id: uid,
                                    code: uid,
                                    categoryCombo: { id: "bjDvmb4bfuf" },
                                    legendSets: [],
                                } as any;

                                store.engine.link
                                    .fetch(
                                        `/api/dataStore/Attributes/Attributes`,
                                        {
                                            method: "PUT",
                                            headers: {
                                                "Content-Type":
                                                    "application/json",
                                            },
                                            body: JSON.stringify([
                                                ...customRows,
                                                {
                                                    ...dataElement,
                                                },
                                            ]),
                                        }
                                    )
                                    .then(async (res: any) => {
                                        setCustomRowLength(customRowLength + 1);

                                        setCustomFieldName("");
                                        setFetching(false);
                                    })
                                    .catch((err: any) => {
                                        setFetching(false);
                                        console.log("Err", err);
                                        // alert("Error");
                                    });
                            });
                    } else {
                        alert("failed to get id");
                    }
                    setFetching(false);
                })
                .catch((err: any) => {
                    console.log("Error", err);
                    setFetching(false);
                });
        }
    }, [customFieldName, customRowLength, customRows, fetching]);

    React.useEffect(() => {
        if (deleting) {
            store.engine.link
                .fetch(`/api/dataStore/Attributes/Attributes`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify([...customRows]),
                })
                .then((raw: any) => raw.json())
                .then((res: any) => {
                    // console.log(res);
                    if (res.httpStatusCode === 200) {
                        setCustomRowLength(customRowLength - 1);
                        setDeleting(false);
                    } else {
                        alert(`${res.httpStatus}: ${res.message}`);
                    }
                    setDeleting(false);
                })
                .catch((err: any) => {
                    setDeleting(false);
                    console.log("Error deleting", err);
                    // alert("Error");
                });
        }
    }, [customFieldName, customRowLength, customRows, deleting]);

    const [notifyx, setNotifyx] = useState(false);
    const onChangeNotify = (e: any) => {
        // console.log("ev", e)
        setNotifyx(e.target.value);
    }
    console.log(store.isIframeEdit)
    const defaultValue = store.isIframeEdit ? "Linked" : ""; // Check if loaded in iframe
    // console.log(defaultValue)


    const [cloudSyncing, setCloudSyncing] = useState(false);
    const googleScriptUrl = "https://script.google.com/macros/s/AKfycbwvvfwSgayXsfWNtNRoKG0hrOg6yMHKym4l3N_UtE7L5sYaXeXUakqwrhEbkpXxBBTV/exec";

    const saveToCloud = async () => {
        setCloudSyncing(true);
        try {
            const data = form.getFieldsValue(true);
            await fetch(googleScriptUrl, {
                method: "POST",
                body: JSON.stringify(data),
                mode: "no-cors",
                headers: { "Content-Type": "text/plain" }
            });
            message.success("Successfully saved form data to cloud!");
        } catch (error) {
            console.error(error);
            message.error("Failed to save to cloud.");
        }
        setCloudSyncing(false);
    };

    const loadFromCloud = async () => {
        setCloudSyncing(true);
        try {
            const response = await fetch(googleScriptUrl, {
                method: "GET",
            });
            const data = await response.json();
            if (Object.keys(data).length > 0) {
                form.setFieldsValue(data);
                message.success("Successfully loaded form data from cloud!");
            } else {
                message.info("No data found in cloud.");
            }
        } catch (error) {
            console.error(error);
            message.error("Failed to load from cloud.");
        }
        setCloudSyncing(false);
    };

    const printComponentRef = useRef(null);
    return (
        <div>
            <Form
                form={form}
                name="death-certificate"
                onFinish={onFinish}
                scrollToFirstError={true}
                initialValues={store.defaultValues}
                onValuesChange={valuesChange}
            >
                <Card
                    title={
                        <Title level={2}>
                            {
                                activeLanguage.lang[
                                "Medical Certificate of Cause of Death"
                                ]
                            }
                        </Title>
                    }
                    actions={[
                        <React.Fragment>
                            <div style={styles.flexRow}>
                                <>
                                    <p style={{ margin: "0rem" }}>
                                        {activeLanguage.lang["Inserting for"]}{" "}
                                        {store.currentOrganisation}{" "}
                                    </p>
                                    {!isEmpty(store.defaultValues) ? (
                                        <Popconfirm
                                            title={
                                                activeLanguage.lang[
                                                "Sure to delete?"
                                                ] ?? "Sure to delete?"
                                            }
                                            onConfirm={() =>
                                                store.deleteEvent()
                                            }
                                        >
                                            <>
                                                <Button size="large">
                                                    {
                                                        activeLanguage.lang[
                                                        "Delete"
                                                        ]
                                                    }
                                                </Button>{" "}
                                            </>
                                        </Popconfirm>
                                    ) : null}
                                    <div>
                                        <Button
                                            size="large"
                                            onClick={onCancel}
                                        >
                                            {activeLanguage.lang["Cancel"]}
                                        </Button>
                                        
                                        <Button
                                            size="large"
                                            onClick={loadFromCloud}
                                            loading={cloudSyncing}
                                            style={{ marginLeft: 8, backgroundColor: '#1890ff', color: 'white', border: 'none' }}
                                        >
                                            Load from Cloud
                                        </Button>

                                        <Button
                                            size="large"
                                            onClick={saveToCloud}
                                            loading={cloudSyncing}
                                            style={{ marginLeft: 8, backgroundColor: '#52c41a', color: 'white', border: 'none' }}
                                        >
                                            Save to Cloud
                                        </Button>

                                        <Button
                                            htmlType="submit"
                                            size="large"
                                            disabled={

                                                store.viewMode
                                            }
                                        >
                                            {activeLanguage.lang["Save"]}
                                        </Button>
                                    </div>
                                </>
                            </div>
                        </React.Fragment>,
                        <div style={{ display: "flex", alignItems: "center" }}>
                            <ApprovalRights
                                style={styles.flexRow}
                                updateApprovalStatus={handleUpdateApproval}
                                statusReceived={approvalStatusFromEditedForm}
                            />
                            <ReactToPrint
                                trigger={() => (
                                    <Button htmlType="button" size="large">
                                        {activeLanguage.lang["Print"] ?? "Print"}
                                    </Button>
                                )}
                                content={() => printComponentRef.current}
                            />
                            <SettingOutlined
                                style={{ fontSize: "24px", marginLeft: "10px" }}
                                onClick={() => setDrawerVisible(!drawerVisible)}
                            />
                        </div>,
                    ]}
                    type="inner"
                    bodyStyle={{ maxHeight: "70vh", overflow: "auto" }}
                >
                    <div style={{ display: "none" }}>
                        <FormPrint
                            ref={printComponentRef}
                            form={form}
                            certified={
                                !!declarations.ZXZZfzBpu8a ||
                                !!declarations.cp5xzqVU2Vw ||
                                !!declarations.lu9BiHPxNqH ||
                                !!declarations.u9tYUv6AM51
                            }
                            formVals={form.getFieldsValue(true)}
                            eventDate={form.getFieldValue("eventDate")}
                        />
                    </div>
                    <div style={{ display: "flex", alignItems: "center" }}>
                        <Form.Item
                            label={activeLanguage.lang["Date of Entry"]}
                            name="eventDate"
                            className="m-0"
                            style={{ display: "none", marginRight: "15px" }}
                        >
                            <DatePicker
                                defaultValue={actualTimeOfDeath}
                                disabledDate={notTomorrow}
                                size="large"
                                // disabled={store.viewMode}
                                disabled={true}
                                placeholder={activeLanguage.lang["Select a Date"]}
                            />
                        </Form.Item>

                        {/* <Radio.Group onChange={onChangeNotify} value={notifyx} className="ml-1" style={{ width: "100%", maxWidth: "50%" }}>
						<Radio value={true}>Notify</Radio>
						<Radio value={false}>Medically Certify</Radio>
					</Radio.Group> */}
                    </div>

                    {/*<Form.Item
          label={activeLanguage.lang.Languages}
          style={{ marginTop: "1rem" }}
          name="language"
          className="m-0"
        >
          <Select
            style={{ minWidth: "200px" }}
            size="large"
            placeholder={activeLanguageString}
            // disabled={disabled || store.viewMode || store.allDisabled[field]}
            // key={optionalKey || `${Math.random()}`}
            onChange={(val: any) => {
              setActiveLanguageString(`${val}`);
              const actualLang = allLanguages.find((l) => l.langName === val);
              if (actualLang && typeof actualLang === "object") {
                setActiveLanguage(actualLang);
                store.setActiveLanguage(actualLang);
              }
            }}
          >
            {allLanguages.map(({ lang, langName }) => (
              <Option key={Math.random()} value={`${langName}`}>
                {langName}
              </Option>
            ))}
          </Select>
        </Form.Item>*/}

                    <table className="my-2 w-full border-collapse">
                        <tbody>
                            <tr>
                                <td className="border p-1" colSpan={2}>
                                    <b>
                                        Date of notification / MCCD
                                    </b>
                                </td>
                                <td className="border p-1" colSpan={2}>
                                    <Form.Item
                                        name="dateOfNotification"
                                        className="m-0"
                                        initialValue={moment()}
                                    >
                                        <DatePicker
                                            style={{ width: '100%' }}
                                            size="large"
                                            disabled={true}
                                            defaultValue={moment()}
                                            format="YYYY-MM-DD"
                                        />
                                    </Form.Item>
                                </td>
                            </tr>
                            <tr>
                                <td className="border p-1">
                                    <b>
                                        {
                                            activeLanguage.lang[
                                            "Ministry of Health National Case Number"
                                            ]
                                        }
                                    </b>
                                </td>
                                <td className="border p-1">
                                    <Form.Item
                                        name="ZKBE8Xm9DJG"
                                        className="m-0"

                                        rules={[
                                            // Add a custom validator function to check if the field has a value
                                            ({ getFieldValue }) => ({
                                                validator(_, value) {
                                                    if (!value) {
                                                        // Return a Promise.reject with an error message if the field is empty
                                                        return Promise.reject('Ministry of Health National Case Number is required');
                                                    }
                                                    // check for length
                                                    if (value.length < 5) {
                                                        return Promise.reject('Ministry of Health National Case Number must be more than 5 characters');
                                                    }
                                                    // Return a Promise.resolve if the field has a value
                                                    return Promise.resolve();
                                                },
                                            }),
                                            {
                                                required: true,
                                                message: 'Ministry of Health National Case Number is required'
                                            },
                                            // { validator: checkMinistryCaseNumber },
                                            !store.editing && {
                                                validator: async (_, value) => {
                                                    const fieldValue = form.getFieldValue("ZKBE8Xm9DJG");
                                                    if (fieldValue) {
                                                        const foundCase = await store.getEventByCase(fieldValue);
                                                        if (foundCase && null !== foundCase.event) {
                                                            // If a value exists and it's different from the current event's value, show error
                                                            message.error('An event with the same Case number was already recorded.');
                                                            return Promise.reject('An event with the same Case number was already recorded.');
                                                        }
                                                    }
                                                    return Promise.resolve();
                                                },
                                            },
                                        ]}
                                    >
                                        <Input
                                            size="large"
                                            disabled={
                                                true
                                                // store.viewMode ||
                                                // store.allDisabled.ZKBE8Xm9DJG
                                            }
                                        />
                                    </Form.Item>
                                </td>

                                <td className="border p-1">
                                    <b>
                                        Inpatient Number
                                    </b>
                                </td>
                                <td className="border p-1">
                                    <Form.Item

                                        name="FGagV1Utrdh"
                                        className="m-0"
                                        rules={
                                            !store.editing ? [
                                                {
                                                    validator: async (_, value) => {
                                                        const fieldValue = form.getFieldValue("FGagV1Utrdh");
                                                        if (fieldValue) {
                                                            const foundInpatient = await store.getEventByInpatientNo(fieldValue);
                                                            if (foundInpatient && null !== foundInpatient.event) {
                                                                // If a value exists and it's different from the current event's value, show error
                                                                message.error('An event with the same Inpatient number was already recorded.');
                                                                return Promise.reject('An event with the same Inpatient number was already recorded.');
                                                            }
                                                        }
                                                        return Promise.resolve();
                                                    },
                                                },
                                            ] : []
                                        }
                                    >
                                        <Input
                                            size="large"
                                            disabled={
                                                store.viewMode ||
                                                store.allDisabled.FGagV1Utrdh
                                            }
                                        />
                                    </Form.Item>
                                </td>

                                {/*event date*/}
                                <td className="border p-1">
                                    <Form.Item
                                        name="W0r4m6NiLsy"
                                        className="m-0"
                                        initialValue={moment().format('YYYY-MM-DD HH:mm:ss')}
                                    >
                                        <Input
                                            size="large"
                                            placeholder="new event date"
                                            disabled={
                                                true
                                            }
                                            // value ={moment().format('YYYY-MM-DD')}
                                            type="hidden"
                                        />
                                    </Form.Item>
                                </td>

                                {/*linked form item*/}
                                <td className="border p-1">
                                    <Form.Item
                                        name="ZkNDFfFSTYg"
                                        className="m-0"
                                    // initialValue={defaultValue} // Set default value here
                                    >
                                        <Input
                                            size="large"
                                            disabled={
                                                true
                                            }
                                            value={defaultValue}
                                            type="hidden"
                                        />
                                    </Form.Item>
                                </td>
                            </tr>

                            <tr>
                                <td className="border p-1">
                                    <b>
                                        Surname
                                    </b>
                                </td>
                                <td className="border p-1">
                                    <Form.Item
                                        name="Q7VM7swIWb6">
                                        <Input
                                            size="large"
                                            disabled={
                                                store.viewMode ||
                                                store.allDisabled.Q7VM7swIWb6
                                            }
                                        />
                                    </Form.Item>
                                </td>
                                <td className="border p-1">
                                    <b>
                                        Given Name
                                    </b>
                                </td>
                                <td className="border p-1">
                                    <Form.Item
                                        name="QmcOqkcNTip"
                                        className="m-0"
                                    >
                                        <Input
                                            size="large"
                                            disabled={
                                                store.viewMode ||
                                                store.allDisabled.QmcOqkcNTip
                                            }
                                        />
                                    </Form.Item>
                                </td>
                            </tr>
                            <tr>
                                <td className="border p-1">
                                    <b>
                                        Other Name
                                    </b>
                                </td>
                                <td className="border p-1">
                                    <Form.Item
                                        name="tuGPnGHWqQn"
                                        className="m-0"
                                    >
                                        <Input
                                            size="large"
                                            disabled={
                                                store.viewMode ||
                                                store.allDisabled.tuGPnGHWqQn
                                            }
                                        />
                                    </Form.Item>
                                </td>
                                <td className="border p-1">
                                    <b>
                                        {idTypeLabel}
                                    </b>
                                </td>
                                <td className="border p-1">
                                    <Form.Item
                                        {...ninValidation}
                                        name="MOstDqSY0gO"
                                        className="m-0"
                                        rules={ //add existing nin check

                                            !store.editing ? [
                                                {
                                                    validator: async (_, value) => {
                                                        const fieldValue = form.getFieldValue("MOstDqSY0gO");
                                                        if (fieldValue) {
                                                            const foundNIN = await store.getEventByNIN(fieldValue);
                                                            if (foundNIN && null !== foundNIN.event) {
                                                                // If a value exists and it's different from the current event's value, show error
                                                                message.error('An event with the same NIN was already recorded.');
                                                                return Promise.reject('An event with the same NIN was already recorded.');
                                                            }
                                                        }
                                                        return Promise.resolve();
                                                    },
                                                },
                                            ] : []
                                        }
                                    >
                                        <Input
                                            size="large"
                                            disabled={
                                                store.viewMode ||
                                                store.allDisabled.ZYKmQ9GPOaF
                                            }
                                        />
                                    </Form.Item>
                                </td>
                            </tr>

                            <tr>

                                <td className="border p-1" colSpan={2}>

                                    <h3
                                        style={{
                                            fontWeight: "bolder",
                                            color: "#000085",
                                        }}
                                    >
                                        {
                                            activeLanguage.lang[
                                            "Place of residence of the deceased"
                                            ] ?? "Place of residence of the deceased"
                                        }
                                    </h3>
                                </td>


                                <td className="border p-1">
                                    <Form.Item
                                        name="twVlVWM3ffz"
                                        className="m-0"
                                        style={{ height: "0rem" }}
                                    >
                                        <Input
                                            type="hidden"
                                            disabled={false}
                                            size="large"
                                            value={approvalStatus}
                                            defaultValue={approvalStatus}
                                            onChange={(e) => {
                                            }}
                                        />
                                    </Form.Item>
                                </td>


                            </tr>


                            <tr>
                                <td className="border p-1">
                                    <b>{activeLanguage.lang["Region"]}</b> <span style={{ color: 'red' }}>*</span>
                                </td>
                                <td className="border p-1">
                                    <Form.Item
                                        name="zwKo51BEayZ"
                                        className="m-0"
                                        rules={[{ required: true, message: 'Selecct a Region' },
                                        ]}

                                    >
                                        <Select
                                            disabled={store.viewMode || store.allDisabled.zwKo51BEayZ}
                                            placeholder="Select a region"
                                            onChange={handleRegionChange}
                                            value={chosenRegion}
                                        >
                                            {regions.map((region) => (
                                                <Select.Option key={region.id} value={region.id}>
                                                    {region.displayName}
                                                </Select.Option>
                                            ))}
                                        </Select>
                                        {/*<DistSearchPopup*/}
                                        {/*    disabled={*/}
                                        {/*        store.viewMode ||*/}
                                        {/*        store.allDisabled.zwKo51BEayZ*/}
                                        {/*    }*/}
                                        {/*    searchType={validSearchTypes.region}*/}
                                        {/*    // setLimitedArray={limitedRegionParent}*/}
                                        {/*    dictatedContent={chosenRegion}*/}
                                        {/*    // setLimitedArrayParent={setLimitedRegionParent}*/}
                                        {/*    receiveOutput={(text: any) => {*/}
                                        {/*        console.log("Chosen region is ", text);*/}
                                        {/*        setChosenRegionToSubmit(*/}
                                        {/*            `${text}`*/}
                                        {/*        );*/}
                                        {/*    }}*/}
                                        {/*/>*/}

                                    </Form.Item>
                                </td>


                                <td className="border p-1">
                                    <b>{activeLanguage.lang["Occupation"]}</b>
                                </td>
                                <td className="border p-1">
                                    <Form.Item
                                        name="b70okb06FWa"
                                        className="m-0"
                                    >
                                        <Input
                                            size="large"
                                            disabled={
                                                store.viewMode ||
                                                store.allDisabled.b70okb06FWa
                                            }
                                        />
                                    </Form.Item>
                                </td>
                            </tr>

                            <tr>
                                <td className="border p-1">
                                    <b>{activeLanguage.lang["District"]}</b><span style={{ color: 'red' }}>*</span>
                                </td>
                                <td className="border p-1">
                                    <Form.Item
                                        name="u44XP9fZweA"
                                        className="m-0"
                                        rules={[{ required: true, message: 'Select a District' },
                                        ]}
                                    >
                                        <Select
                                            placeholder="Select a district"
                                            onChange={handleDistrictChange}
                                            value={chosenDistrict}
                                            disabled={store.viewMode || store.allDisabled.u44XP9fZweA || !districts.length}
                                        >
                                            {districts.map((district) => (
                                                <Select.Option key={district.id} value={district.id}>
                                                    {district.displayName}
                                                </Select.Option>
                                            ))}
                                        </Select>


                                        {/*<DistSearchPopup*/}
                                        {/*    disabled={*/}
                                        {/*        store.viewMode || store.allDisabled.u44XP9fZweA*/}
                                        {/*    }*/}
                                        {/*    searchType={validSearchTypes.district}*/}
                                        {/*    parentName={chosenRegionToSubmit}*/}
                                        {/*    // setLimitedArray={setLimitedDistrictParent}*/}
                                        {/*    dictatedContent={chosenDistrict}*/}
                                        {/*    // setLimitedArrayParent={setLimitedRegionParent}*/}
                                        {/*    // receiveOutput={(text: any) =>*/}
                                        {/*    //     setChosenDistrictToSubmit(*/}
                                        {/*    //         `${text}`*/}
                                        {/*    //     )*/}
                                        {/*    // }*/}
                                        {/*    receiveOutput={(text: string, id: string) => {*/}
                                        {/*        setChosenDistrictToSubmit(text);*/}
                                        {/*        setChosenDistrictId(id); // Store the district ID*/}
                                        {/*    }}*/}
                                        {/*/>*/}
                                    </Form.Item>
                                    {/* <Form.Item name="bNpMzyShDCX" className="m-0">
                  <Input
                    size="large"
                    disabled={store.viewMode || store.allDisabled.bNpMzyShDCX}
                  />
                </Form.Item> */}
                                </td>

                                <td className="border p-1">
                                    <b>
                                        {
                                            activeLanguage.lang[
                                            "Date of Birth Known ?"
                                            ]
                                        }
                                    </b>
                                </td>
                                <td className="border p-1">
                                    <Form.Item
                                        name="roxn33dtLLx"
                                        className="m-0">
                                        <Checkbox
                                            disabled={
                                                store.viewMode ||
                                                store.allDisabled.roxn33dtLLx
                                            }
                                            checked={ageKnown}
                                            // onClick={() => form.setFieldsValue({ roxn33dtLLx: "Yes" })}
                                            onChange={(val: any) => {
                                                console.log(
                                                    "VAL IS ",
                                                    val?.target?.checked
                                                );
                                                setAgeKnown(val?.target?.checked);
                                                form.setFieldsValue({
                                                    roxn33dtLLx: "Yes",
                                                });
                                                store.disableValue("q7e7FOXKnOf");
                                            }}
                                        >
                                            {activeLanguage.lang["Yes"]}
                                        </Checkbox>

                                        <Checkbox
                                            // onChange={(val: any) => console.log("VAL IS ", val?.target)}
                                            disabled={
                                                store.viewMode ||
                                                store.allDisabled.roxn33dtLLx
                                            }
                                            checked={!ageKnown}
                                            onChange={(val: any) => {

                                                setAgeKnown(!val?.target?.checked);
                                                form.setFieldsValue({
                                                    roxn33dtLLx: "No",
                                                });
                                                form.setFieldsValue({
                                                    roxn33dtLLx: "No",
                                                    RbrUuKFSqkZ: null,         // Clear date of birth
                                                    q7e7FOXKnOf: null,         // Clear age in years
                                                    WYykJO0Vh3s: null,         // Clear age in months
                                                    v8mvHHXo06E: null          // Clear age in days
                                                });
                                                store.enableValue("q7e7FOXKnOf");
                                            }}
                                        >
                                            {activeLanguage.lang["No"]}
                                        </Checkbox>

                                    </Form.Item>
                                </td>
                            </tr>
                            <tr>
                                <td className="border p-1">
                                    <b>{activeLanguage.lang["County"] ?? "County"}</b>
                                </td>
                                <td className="border p-1">
                                    <Form.Item
                                        name="se3wRj1bYPo"
                                        className="m-0"
                                    >
                                        <Input
                                            size="large"
                                            disabled={
                                                store.viewMode ||
                                                store.allDisabled.se3wRj1bYPo
                                            }
                                        />
                                    </Form.Item>
                                </td>


                                <td className="border p-1">
                                    <b>
                                        {activeLanguage.lang["Date of Birth"]} <span style={{ color: 'red' }}>*</span>
                                    </b>
                                </td>
                                <td className="border p-1">
                                    {!forceResetDOB ? (
                                        <Form.Item
                                            name="RbrUuKFSqkZ"
                                            className="m-0"
                                            rules={[{ required: true, message: 'Date of birth is required' },
                                            ]}
                                        >
                                            <DatePicker
                                                disabledDate={notTomorrow}
                                                size="large"
                                                placeholder={activeLanguage.lang["Select a Date"]}
                                                disabled={!ageKnown} // Disable if date of birth is not known
                                                onChange={(e: any) => {
                                                    if (e?._d) {
                                                        console.log("Date of birth has changed", e);
                                                        // const birthDate = new Date(e?._d);
                                                        // const ageInYears = moment().diff(birthDate, "years");
                                                        const ageInYears = moment().diff(e, "years");
                                                        const ageInDays = moment().diff(e, "days");

                                                        setPersonsAgeInDays(ageInDays);
                                                        setAgeKnown(true);
                                                        setPersonsAge(ageInYears);
                                                    }
                                                }}
                                            />
                                        </Form.Item>
                                    ) : null}
                                </td>
                            </tr>
                            <tr>
                                <td className="border p-1">
                                    <b>{activeLanguage.lang["Sub-County"]}</b> <span style={{ color: 'red' }}>*</span>
                                </td>
                                <td className="border p-1">
                                    <Form.Item
                                        name="t5nTEmlScSt"
                                        className="m-0"
                                        rules={[{ required: true, message: 'Sub-County is required' },
                                        ]}
                                    >
                                        <Select
                                            placeholder="Select Sub-County"
                                            // disabled={!chosenDistrictToSubmit}
                                            allowClear
                                            showSearch
                                            filterOption={(input, option) =>
                                                (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                                            }
                                        >
                                            {subCountyOptions.map(({ id, displayName }) => (
                                                <Option key={id} value={id}>
                                                    {displayName}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                </td>


                                <td className="border p-1">
                                    <b>{activeLanguage.lang["Age"]} <span style={{ color: 'red' }}>*</span></b>
                                </td>
                                <td className="border p-1 d-flex">
                                    <Form.Item

                                        name="q7e7FOXKnOf"
                                        className="m-0"
                                        label="Years"
                                        rules={[{ required: true, message: 'Age is required' },
                                        ]}
                                    >
                                        <InputNumber
                                            size="large"
                                            placeholder="Years"
                                            disabled={
                                                store.viewMode ||
                                                store.allDisabled.q7e7FOXKnOf
                                            }
                                            onChange={(e: any) => {
                                                console.log("Age changed to", e);

                                                setPersonsAge(e);
                                                if (personsGender === "Male") {
                                                    setShowPregnancyReminder(
                                                        false
                                                    );
                                                    setEnablePregnantQn(false);
                                                    setEnablePregnantQnKey(
                                                        `${parseInt(
                                                            enablePregnantQnKey
                                                        ) + 1
                                                        }`
                                                    );
                                                    return;
                                                }

                                                if (
                                                    personsGender ===
                                                    "Female" &&
                                                    e < 50 &&
                                                    e > 10
                                                ) {
                                                    setShowPregnancyReminder(
                                                        true
                                                    );
                                                    setEnablePregnantQn(true);
                                                    setEnablePregnantQnKey(
                                                        `${parseInt(
                                                            enablePregnantQnKey
                                                        ) + 1
                                                        }`
                                                    );
                                                    window.alert(
                                                        activeLanguage.lang[
                                                        "Please Remember to fill in the section: For women, was the deceased pregnant or within 6 weeks of delivery?"
                                                        ]
                                                    );
                                                }
                                            }}
                                        />
                                    </Form.Item>
                                    <Form.Item
                                        name="WYykJO0Vh3s"
                                        className="m-0"
                                        style={{ width: "100%" }}
                                        label="Months:"
                                    >
                                        <InputNumber
                                            size="large"
                                            placeholder="months"
                                            disabled={
                                                store.viewMode ||
                                                store.allDisabled.n9s5bKgCCVq
                                            }
                                        />


                                    </Form.Item>

                                    {

                                        mcodmap.quKRjZzkSRA !== undefined && mcodmap.quKRjZzkSRA && (
                                            <Form.Item
                                                name="v8mvHHXo06E"
                                                className="m-0"
                                                style={{ width: "100%" }}
                                                label="Days"
                                            >
                                                <InputNumber
                                                    size="large"
                                                    placeholder="Days"
                                                    disabled={
                                                        store.viewMode ||
                                                        store.allDisabled.n9s5bKgCCVq
                                                    }
                                                />

                                            </Form.Item>
                                        )
                                    }
                                    {
                                        mcodmap.rDI0uhcVLAk !== undefined && mcodmap.rDI0uhcVLAk && (
                                            <Form.Item
                                                name="VJXpmHCaAFG"
                                                className="m-0"
                                                style={{ width: "100%" }}
                                                label="Hours"
                                            >
                                                <InputNumber
                                                    size="large"
                                                    placeholder="Hours"
                                                    max={24}
                                                    disabled={
                                                        store.viewMode ||
                                                        store.allDisabled.n9s5bKgCCVq
                                                    }
                                                />
                                            </Form.Item>
                                        )}
                                    {/*check for baby age fields */}
                                    {
                                        mcodmap.rjoVXlCWLYM !== undefined && mcodmap.rjoVXlCWLYM && (
                                            <Form.Item
                                                name="TgFI46omIEg"
                                                className="m-0"
                                                style={{ width: "100%" }}
                                                label="Minutes"
                                            >
                                                <InputNumber
                                                    size="large"
                                                    placeholder="Minutes"
                                                    max={60}
                                                    disabled={
                                                        store.viewMode ||
                                                        store.allDisabled.n9s5bKgCCVq
                                                    }
                                                />
                                            </Form.Item>
                                        )
                                    }

                                    {/*fix css for age row*/}
                                    <Form.Item
                                        // name="v8mvHHXo06E"
                                        className="m-0"
                                        style={{ width: "100%" }}
                                    >

                                    </Form.Item>
                                </td>
                            </tr>
                            <tr>
                                <td className="border p-1">
                                    <b>{activeLanguage.lang["Village"]}</b>  <span style={{ color: 'red' }}>*</span>
                                </td>
                                <td className="border p-1">
                                    <Form.Item
                                        name="dsiwvNQLe5n"
                                        className="m-0"
                                        rules={[{ required: true, message: 'Date of birth is required' },
                                        ]}
                                    >
                                        <Input
                                            size="large"
                                            disabled={
                                                store.viewMode ||
                                                store.allDisabled.dsiwvNQLe5n
                                            }
                                        />
                                    </Form.Item>
                                </td>


                                <td className="border p-1">
                                    <b>{activeLanguage.lang["Sex"]} <span style={{ color: 'red' }}>*</span></b>
                                </td>
                                <td className="border p-1">
                                    {optionSets ? (
                                        <Form.Item
                                            name="e96GB4CXyd3"
                                            className="m-0"
                                            rules={[{ required: true, message: 'Sex is required' },
                                            ]}
                                        >
                                            {optionSet(
                                                "SX01",
                                                "e96GB4CXyd3",
                                                (e: any) => {
                                                    setPersonsGender(e);
                                                    if (e === "Male") {
                                                        setShowPregnancyReminder(false);
                                                        setEnablePregnantQn(false);
                                                        setEnablePregnantQnKey(
                                                            `${parseInt(enablePregnantQnKey) + 1}`
                                                        );
                                                        return;
                                                    }
                                                    if (e === "Female") {
                                                        console.log(
                                                            "Is female"
                                                        );
                                                        if (
                                                            personsAge < 61 &&
                                                            personsAge > 12
                                                        ) {
                                                            setShowPregnancyReminder(true);
                                                            setEnablePregnantQn(true);
                                                            setEnablePregnantQnKey(
                                                                `${parseInt(enablePregnantQnKey) + 1}`);
                                                            window.alert(
                                                                activeLanguage
                                                                    .lang[
                                                                "Please Remember to fill in the section: For women, was the deceased pregnant or within 6 weeks of delivery?"
                                                                ]
                                                            );
                                                        }
                                                    }
                                                }
                                            )}
                                        </Form.Item>
                                    ) : null}
                                </td>
                            </tr>
                            <tr>
                                <td className="border p-1">
                                    <b>
                                        {
                                            activeLanguage.lang[
                                            "Date and time of death"
                                            ]
                                        } <span style={{ color: 'red' }}>*</span>
                                    </b>
                                </td>
                                <td className="border p-1">
                                    <Form.Item
                                        name="i8rrl8YWxLF"
                                        className="m-0"
                                        rules={[{ required: true, message: 'Date and time of death is required' },
                                        ]}
                                    >
                                        <DatePicker
                                            defaultValue={actualTimeOfDeath}
                                            // disabledDate={notTomorrow}
                                            size="large"
                                            showTime
                                            format="YYYY-MM-DD HH:mm:ss"
                                            placeholder={
                                                activeLanguage.lang[
                                                "Select date and time of death"
                                                ]
                                            }
                                            disabled={
                                                store.viewMode ||
                                                store.allDisabled.i8rrl8YWxLF
                                            }
                                            onChange={(e: any) => {
                                                form.setFieldsValue({ eventDate: e });
                                                var minutes = 1000 * 60;
                                                var hours = minutes * 60;
                                                var days = hours * 24;

                                                console.log(
                                                    "Time of death has changed to",
                                                    e
                                                );
                                                setActualTimeOfDeath(e);
                                                var foo_date1 = form.getFieldValue(
                                                    "RbrUuKFSqkZ"
                                                );
                                                var foo_date2 = e
                                                var diff_date = Math.round(
                                                    (foo_date2 - foo_date1) /
                                                    days
                                                );

                                                console.log(
                                                    "diff_date is ",
                                                    diff_date
                                                );
                                                // console.log("function diffdate has been run ");

                                                // if (diff_date < 25) {
                                                //     window.alert(
                                                //         activeLanguage.lang[
                                                //             "Please remember that you should also complete the section 'Fetal or infant Death'"
                                                //             ]
                                                //     );
                                                // }
                                            }}
                                        />
                                    </Form.Item>
                                </td>
                            </tr>
                            {customRows.map(
                                (
                                    {
                                        name,
                                        id,
                                    }: { name: string; id: string | null },
                                    index: number
                                ) => {
                                    // console.log(index, " custom rows");
                                    return (
                                        <tr key={index}>
                                            <td
                                                className="border p-1"
                                                colSpan={2}
                                            >
                                                <b>{name}</b>
                                            </td>
                                            <td
                                                className="border p-1"
                                                colSpan={2}
                                            >
                                                <span
                                                    style={{ display: "flex" }}
                                                >
                                                    <Form.Item
                                                        name={id as string}
                                                        className="m-0"
                                                        style={{ flexGrow: 1 }}
                                                        initialValue={
                                                            store.defaultValues[
                                                            id
                                                            ]
                                                        }
                                                    >
                                                        <Input
                                                            size="large"
                                                            disabled={
                                                                store.viewMode
                                                            }
                                                        // disabled={
                                                        //     store.viewMode ||
                                                        //     store.allDisabled.ZKBE8Xm9DJG
                                                        // }
                                                        />
                                                    </Form.Item>
                                                    <span
                                                        style={{
                                                            display:
                                                                "inline-block",
                                                            cursor: "pointer",
                                                        }}
                                                    >
                                                        <button
                                                            disabled={
                                                                fetching ||
                                                                deleting
                                                            }
                                                            type="button"
                                                            className="ant-btn ant-btn-lg ant-btn-icon-only"
                                                            onClick={() => {
                                                                const rows = [
                                                                    ...customRows,
                                                                ];
                                                                rows.splice(
                                                                    index,
                                                                    1
                                                                );
                                                                setCustomRows([
                                                                    ...rows,
                                                                ]);
                                                                setDeleting(
                                                                    true
                                                                );
                                                            }}
                                                        >
                                                            <span
                                                                role="img"
                                                                aria-label="close"
                                                                className="anticon anticon-close"
                                                                style={{
                                                                    fontSize:
                                                                        "16px",
                                                                    color:
                                                                        "red",
                                                                }}
                                                            >
                                                                <svg
                                                                    viewBox="64 64 896 896"
                                                                    focusable="false"
                                                                    data-icon="close"
                                                                    width="1em"
                                                                    height="1em"
                                                                    fill="currentColor"
                                                                    aria-hidden="true"
                                                                >
                                                                    <path
                                                                        d="M563.8 512l262.5-312.9c4.4-5.2.7-13.1-6.1-13.1h-79.8c-4.7 0-9.2 2.1-12.3 5.7L511.6 449.8 295.1 191.7c-3-3.6-7.5-5.7-12.3-5.7H203c-6.8 0-10.5 7.9-6.1 13.1L459.4 512 196.9 824.9A7.95 7.95 0 00203 838h79.8c4.7 0 9.2-2.1 12.3-5.7l216.5-258.1 216.5 258.1c3 3.6 7.5 5.7 12.3 5.7h79.8c6.8 0 10.5-7.9 6.1-13.1L563.8 512z"></path>
                                                                </svg>
                                                            </span>
                                                        </button>
                                                    </span>
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                }
                            )}
                            <tr>
                                <td className="border p-1">
                                    <b>
                                        Place of death:
                                    </b>
                                </td>
                                <td className="border p-1">
                                    <Form.Item
                                        name="NPE6arvf4mF"
                                        className="m-0"
                                    >
                                        <Select
                                            size="large"
                                            disabled={store.viewMode || store.allDisabled.NPE6arvf4mF}
                                            placeholder="Select place of death"
                                            onChange={val => setSelectedPlaceOfDeath(val)}
                                            value={selectedPlaceOfDeath}
                                        >
                                            <Select.Option value="Health Facility">Health Facility</Select.Option>
                                            <Select.Option value="Community">Community</Select.Option>
                                        </Select>
                                    </Form.Item>
                                </td>

                                <td className="border p-1">
                                    <b>
                                        Place of death out of facility description:
                                    </b>
                                </td>
                                <td className="border p-1">
                                    {optionSets ? (

                                        <Form.Item
                                            name="sA334hwknqq"
                                            className="m-0"
                                        >
                                            <Input
                                                size="large"
                                                disabled={selectedPlaceOfDeath === "Health Facility"}
                                            />

                                            {/*{optionSet("HMIS_100 Place of death out of facility", "FAsTh8L7Yrw",  undefined,*/}
                                            {/*    selectedPlaceOfDeath === "Health Facility")}*/}
                                        </Form.Item>
                                    ) : null}
                                </td>


                                {/*<td className="border p-1">*/}

                                {/*    <Form.Item*/}
                                {/*        name="FAsTh8L7Yrw"*/}
                                {/*        className="m-0"*/}
                                {/*    >*/}
                                {/*        <select className="border p-1 w-full">*/}
                                {/*            <option value="">Select an option</option>*/}
                                {/*            <option value="Community">Community</option>*/}
                                {/*            <option value="Transit">Transit</option>*/}
                                {/*            <option value="Other Facility">Other Facility</option>*/}
                                {/*        </select>*/}

                                {/*    </Form.Item>*/}

                                {/*</td>*/}
                            </tr>
                        </tbody>
                    </table>

                    <div
                        style={{
                            padding: "4px",
                        }}
                    >
                        {creatingCustomField && (
                            <>
                                <p>Press Enter To Submit</p>{" "}
                                <Input
                                    value={customFieldName}
                                    onChange={(e) => {
                                        setCustomFieldName(e.target.value);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.keyCode === 13) {
                                            setCreatingFiled(false);
                                            setFetching(true);
                                        }
                                    }}
                                />
                            </>
                        )}
                    </div>



                    <table className="my-2 w-full border-collapse px-2"
                        style={{ ...(notifyx ? ({ display: "none" }) : ({})) }}>
                        <tbody>
                            <tr>
                                <td
                                    colSpan={7}
                                    className="border p-1 text-lg"
                                    style={{ background: titleBackgroundColor }}
                                >
                                    <h3
                                        style={{
                                            fontWeight: "bolder",
                                            color: "#000085",
                                        }}
                                    >
                                        {
                                            activeLanguage.lang[
                                            "Frame A: Medical Data. Part 1 and 2"
                                            ]
                                        }
                                    </h3>
                                </td>
                            </tr>
                            <tr>
                                <th style={{ width: "15%" }}></th>
                                <th style={{ width: "5%" }}></th>
                                <th style={{ width: "25%" }}></th>
                                <th style={{ width: "15%" }}></th>
                                <th style={{ width: "20%" }}></th>
                                <th style={{ width: "10%" }}></th>
                                <th style={{ width: "7%" }}></th>
                            </tr>
                            <tr>
                                <td className="border p-1 w-1/4"></td>
                                <td className="border p-1" />
                                <td className="border p-1">
                                    {" "}
                                    <b>
                                        {activeLanguage.lang["Cause of death"]}
                                    </b>{" "}
                                </td>
                                <td className="border p-1">
                                    {" "}
                                    <b>{activeLanguage.lang["Code"]}</b>{" "}
                                </td>
                                <td className="border p-1">
                                    {" "}
                                    <b>
                                        {
                                            activeLanguage.lang[
                                            "Cause of Death Free Text"
                                            ]
                                        }
                                    </b>{" "}
                                </td>
                                <td className="border p-1">
                                    {" "}
                                    <b>
                                        {
                                            activeLanguage.lang[
                                            "Time interval type from onset to death"
                                            ]
                                        }
                                    </b>
                                </td>
                                <td className="border p-1">
                                    {" "}
                                    <b>
                                        {
                                            activeLanguage.lang[
                                            "Time interval from onset to death"
                                            ]
                                        }
                                    </b>
                                </td>
                            </tr>
                            <tr>
                                <td className="border p-1">
                                    {" "}
                                    <b>
                                        {
                                            activeLanguage.lang[
                                            "Report disease or condition directly leading to death on line"
                                            ]
                                        }
                                    </b>
                                </td>
                                <td className="border p-1">
                                    {" "}
                                    <b>a</b>{" "}
                                </td>

                                {/* ICD FIELD */}
                                <td className="border p-1">
                                    <ICDField
                                        id="icdField1"
                                        enableAltText={(value: boolean) => {
                                            toggleEnableAltSearch("a", value);
                                        }}
                                        disabled={store.allDisabled.sfpqAeqKeyQ}
                                        next="Ylht9kCLSRW"
                                        dvalue={defaultUCause.sfpqAeqKeyQ}
                                        form={form}
                                        field="sfpqAeqKeyQ"
                                        codeField="zD0E77W4rFs"
                                        uriField="k9xdBQzYMXo"
                                        searchQueryField="cSDJ9kSJkFP"
                                        bestMatchTextField="ZwBcxhUGzMb"
                                        addUnderlyingCause={(
                                            value: any,
                                            title?: any,
                                            uri?: any
                                        ) => {
                                            editUnderlyingCauses(
                                                "a",
                                                title ? title : null,
                                                value,
                                                uri ? uri : null
                                            );
                                        }}
                                        key={AKey}
                                        resetUnderlyingCauseDropdown={
                                            setUnderlyingCauseKey
                                        }
                                    />
                                </td>

                                {/* CODE */}
                                <td className="border p-1">
                                    <Form.Item
                                        name="zD0E77W4rFs"
                                        className="m-0"
                                    >
                                        <Input
                                            readOnly={true}
                                            size="large"
                                            disabled={
                                                store.viewMode ||
                                                store.allDisabled.zD0E77W4rFs
                                            }
                                        />
                                    </Form.Item>
                                </td>

                                {/* CAUSE OF DEATH */}
                                <td className="border p-1">
                                    <Form.Item
                                        name="cSDJ9kSJkFP"
                                        className="m-0"
                                    >
                                        <table>
                                            <tbody>
                                                <tr>
                                                    <td>
                                                        <Input
                                                            size="large"
                                                            // disabled={
                                                            //     store.viewMode ||
                                                            //     store.allDisabled
                                                            //         .cSDJ9kSJkFP
                                                            // }
                                                            disabled={!!form.getFieldValue('zD0E77W4rFs')} // Disable when code exists
                                                            value={testVal}
                                                            onChange={(e: any) => {
                                                                setTestVal(
                                                                    e.target.value
                                                                );
                                                                editUnderlyingCauses(
                                                                    "a",
                                                                    e.target.value
                                                                );
                                                            }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <Popconfirm
                                                            title={
                                                                activeLanguage.lang[
                                                                "Sure to add coded COD"
                                                                ]
                                                            }
                                                            onConfirm={() => {
                                                                buttonA();

                                                                //   Enable the search field and disable this one
                                                                store.enableValue(
                                                                    "zD0E77W4rFs"
                                                                );
                                                                store.enableValue(
                                                                    "sfpqAeqKeyQ"
                                                                );
                                                                store.disableValue(
                                                                    "cSDJ9kSJkFP"
                                                                );
                                                                store.disableValue(
                                                                    "Ylht9kCLSRW"
                                                                );
                                                                form.setFieldsValue(
                                                                    {
                                                                        zD0E77W4rFs: null,
                                                                    }
                                                                );
                                                                form.setFieldsValue(
                                                                    {
                                                                        sfpqAeqKeyQ: null,
                                                                    }
                                                                );

                                                                setTimeout(() => {
                                                                    //  Force rerender of icd field
                                                                    setAKey(
                                                                        Math.random()
                                                                    );
                                                                }, 200);
                                                            }}
                                                        >
                                                            <Button
                                                                size="large"
                                                                name="btnFreeTextA"
                                                            >
                                                                X
                                                            </Button>
                                                        </Popconfirm>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </Form.Item>
                                </td>
                                <td className="border p-1">
                                    {optionSets ? (

                                        <Form.Item
                                            name="Ylht9kCLSRW"
                                            className="m-0"
                                        >
                                            <Select size="large" placeholder="Select an option" disabled={store.viewMode || store.allDisabled.Ylht9kCLSRW}>
                                                <Option value="Minutes">{tr("Minutes")}</Option>
                                                <Option value="Hours">{tr("Hours")}</Option>
                                                <Option value="Days">{tr("Days")}</Option>
                                                <Option value="Weeks">{tr("Weeks")}</Option>
                                                <Option value="Months">{tr("Months")}</Option>
                                                <Option value="Years">{tr("Years")}</Option>
                                            </Select>
                                        </Form.Item>
                                    ) : null}
                                </td>
                                <td className="border p-1">
                                    <Form.Item
                                        name="WkXxkKEJLsg"
                                        className="m-0"
                                    >
                                        <InputNumber
                                            min={1}
                                            size="large"
                                            disabled={
                                                store.viewMode ||
                                                store.allDisabled.WkXxkKEJLsg
                                            }
                                        />
                                    </Form.Item>
                                </td>
                            </tr>

                            <tr>
                                <td className="border p-1" rowSpan={3}>
                                    <b>
                                        {
                                            activeLanguage.lang[
                                            "Report chain of events 'due to' (b to d) in order (if applicable)"
                                            ]
                                        }
                                    </b>{" "}
                                </td>
                                <td className="border p-1">
                                    <b>b</b>
                                </td>
                                <td className="border p-1">
                                    <ICDField
                                        id="icdField2"
                                        next="myydnkmLfhp"
                                        enableAltText={(value: boolean) => {
                                            toggleEnableAltSearch("b", value);
                                        }}
                                        disabled={store.allDisabled.zb7uTuBCPrN}
                                        dvalue={form.getFieldValue("zb7uTuBCPrN")}
                                        form={form}
                                        field="zb7uTuBCPrN"
                                        searchQueryField="uckvenVFnwf"
                                        codeField="tuMMQsGtE69"
                                        uriField="yftBZ5bSEOb"
                                        key={BKey}
                                        addUnderlyingCause={(
                                            value: any,
                                            title?: any,
                                            uri?: any
                                        ) => {
                                            editUnderlyingCauses(
                                                "b",
                                                title ? title : null,
                                                value,
                                                uri ? uri : null
                                            );
                                        }}
                                        resetUnderlyingCauseDropdown={
                                            setUnderlyingCauseKey
                                        }
                                    />
                                </td>
                                <td className="border p-1">
                                    <Form.Item
                                        name="tuMMQsGtE69"
                                        className="m-0"
                                    >
                                        <Input
                                            readOnly={true}
                                            size="large"
                                            disabled={
                                                store.viewMode ||
                                                store.allDisabled.tuMMQsGtE69
                                            }
                                        />
                                    </Form.Item>
                                </td>
                                <td className="border p-1">
                                    <Form.Item
                                        name="uckvenVFnwf"
                                        className="m-0"
                                    >
                                        <table>
                                            <tbody>
                                                <tr>
                                                    <td>
                                                        <Input
                                                            size="large"
                                                            // disabled={
                                                            //     store.viewMode ||
                                                            //     store.allDisabled
                                                            //         .uckvenVFnwf
                                                            // }
                                                            disabled={!!form.getFieldValue('tuMMQsGtE69')} // Disable when code exists
                                                            value={testVal2}
                                                            onChange={(e: any) => {
                                                                setTestVal2(
                                                                    e.target.value
                                                                );
                                                                editUnderlyingCauses(
                                                                    "b",
                                                                    e.target.value
                                                                );
                                                            }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <Popconfirm
                                                            title={
                                                                activeLanguage.lang[
                                                                "Sure to add coded COD"
                                                                ]
                                                            }
                                                            onConfirm={() => {
                                                                buttonB();

                                                                //   Enable the search field and disable this one
                                                                store.enableValue(
                                                                    "tuMMQsGtE69"
                                                                );
                                                                store.enableValue(
                                                                    "zb7uTuBCPrN"
                                                                );

                                                                store.disableValue(
                                                                    "uckvenVFnwf"
                                                                );
                                                                store.disableValue(
                                                                    "myydnkmLfhp"
                                                                );
                                                                form.setFieldsValue(
                                                                    {
                                                                        tuMMQsGtE69: null,
                                                                    }
                                                                );
                                                                form.setFieldsValue(
                                                                    {
                                                                        zb7uTuBCPrN: null,
                                                                    }
                                                                );

                                                                setTimeout(() => {
                                                                    //  Force rerender of icd field
                                                                    setBKey(
                                                                        Math.random()
                                                                    );
                                                                }, 200);
                                                            }}
                                                        >
                                                            <Button
                                                                size="large"
                                                                name="btnFreeTextB"
                                                            >
                                                                X
                                                            </Button>
                                                        </Popconfirm>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </Form.Item>
                                </td>
                                <td className="border p-1">
                                    {optionSets ? (
                                        <Form.Item
                                            name="myydnkmLfhp"
                                            className="m-0"
                                        >
                                            <Select size="large" placeholder="Select an option" disabled={store.viewMode || store.allDisabled.myydnkmLfhp}>
                                                <Option value="Minutes">{tr("Minutes")}</Option>
                                                <Option value="Hours">{tr("Hours")}</Option>
                                                <Option value="Days">{tr("Days")}</Option>
                                                <Option value="Weeks">{tr("Weeks")}</Option>
                                                <Option value="Months">{tr("Months")}</Option>
                                                <Option value="Years">{tr("Years")}</Option>
                                            </Select>
                                            {/* <Select placeholder="Select an option">
												<Option value="Minutes">Minutes</Option>
												<Option value="Hours">Hours</Option>
												<Option value="Days">Days</Option>
												<Option value="Weeks">Weeks</Option>
												<Option value="Months">Months</Option>
												<Option value="Years">Years</Option>
											</Select> */}
                                        </Form.Item>
                                    ) : null}
                                </td>
                                <td className="border p-1">
                                    <Form.Item
                                        name="fleGy9CvHYh"
                                        className="m-0"
                                    >
                                        <InputNumber
                                            min={1}
                                            size="large"
                                            disabled={
                                                store.viewMode ||
                                                store.allDisabled.fleGy9CvHYh
                                            }
                                        />
                                    </Form.Item>
                                </td>
                            </tr>

                            <tr>
                                <td className="border p-1">
                                    <b>c</b>
                                </td>
                                <td className="border p-1">
                                    <ICDField
                                        id="icdField3"
                                        enableAltText={(value: boolean) => {
                                            toggleEnableAltSearch("c", value);
                                        }}
                                        next="aC64sB86ThG"
                                        disabled={store.allDisabled.QGFYJK00ES7}
                                        form={form}
                                        dvalue={form.getFieldValue("QGFYJK00ES7")}
                                        field="QGFYJK00ES7"
                                        searchQueryField="ZFdJRT3PaUd"
                                        codeField="C8n6hBilwsX"
                                        uriField="fJUy96o8akn"
                                        key={CKey}
                                        addUnderlyingCause={(
                                            value: any,
                                            title?: any,
                                            uri?: any
                                        ) => {
                                            editUnderlyingCauses(
                                                "c",
                                                title ? title : null,
                                                value,
                                                uri ? uri : null
                                            );
                                        }}
                                        resetUnderlyingCauseDropdown={
                                            setUnderlyingCauseKey
                                        }
                                    />
                                </td>

                                <td className="border p-1">
                                    <Form.Item
                                        name="C8n6hBilwsX"
                                        className="m-0"
                                    >
                                        <Input
                                            readOnly={true}
                                            size="large"
                                            disabled={
                                                store.viewMode ||
                                                store.allDisabled.C8n6hBilwsX
                                            }
                                        />
                                    </Form.Item>
                                </td>
                                <td className="border p-1">
                                    <Form.Item
                                        name="ZFdJRT3PaUd"
                                        className="m-0"
                                    >
                                        <table>
                                            <tbody>
                                                <tr>
                                                    <td>
                                                        <Input
                                                            size="large"
                                                            // disabled={
                                                            //     store.viewMode ||
                                                            //     store.allDisabled
                                                            //         .ZFdJRT3PaUd
                                                            // }
                                                            disabled={!!form.getFieldValue('C8n6hBilwsX')} // Disable when code exists
                                                            value={testVal3}
                                                            onChange={(e: any) => {
                                                                setTestVal3(
                                                                    e.target.value
                                                                );
                                                                editUnderlyingCauses(
                                                                    "c",
                                                                    e.target.value
                                                                );
                                                            }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <Popconfirm
                                                            title={
                                                                activeLanguage.lang[
                                                                "Sure to add coded COD"
                                                                ]
                                                            }
                                                            onConfirm={() => {
                                                                buttonC();

                                                                //   Enable the search field and disable this one
                                                                store.enableValue(
                                                                    "C8n6hBilwsX"
                                                                );
                                                                store.enableValue(
                                                                    "QGFYJK00ES7"
                                                                );
                                                                store.disableValue(
                                                                    "ZFdJRT3PaUd"
                                                                );
                                                                store.disableValue(
                                                                    "aC64sB86ThG"
                                                                );
                                                                form.setFieldsValue(
                                                                    {
                                                                        C8n6hBilwsX: null,
                                                                    }
                                                                );
                                                                form.setFieldsValue(
                                                                    {
                                                                        QGFYJK00ES7: null,
                                                                    }
                                                                );

                                                                setTimeout(() => {
                                                                    //  Force rerender of icd field
                                                                    setCKey(
                                                                        Math.random()
                                                                    );
                                                                }, 200);
                                                            }}
                                                        >
                                                            <Button
                                                                size="large"
                                                                name="btnFreeTextC"
                                                            >
                                                                X
                                                            </Button>
                                                        </Popconfirm>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </Form.Item>
                                </td>
                                <td className="border p-1">
                                    {optionSets ? (
                                        <Form.Item
                                            name="aC64sB86ThG"
                                            className="m-0"
                                        >
                                            <Select size="large" placeholder="Select an option" disabled={store.viewMode || store.allDisabled.aC64sB86ThG}>
                                                <Option value="Minutes">{tr("Minutes")}</Option>
                                                <Option value="Hours">{tr("Hours")}</Option>
                                                <Option value="Days">{tr("Days")}</Option>
                                                <Option value="Weeks">{tr("Weeks")}</Option>
                                                <Option value="Months">{tr("Months")}</Option>
                                                <Option value="Years">{tr("Years")}</Option>
                                            </Select>
                                            {/* <Select placeholder="Select an option">
												<Option value="Minutes">Minutes</Option>
												<Option value="Hours">Hours</Option>
												<Option value="Days">Days</Option>
												<Option value="Weeks">Weeks</Option>
												<Option value="Months">Months</Option>
												<Option value="Years">Years</Option>
											</Select> */}
                                        </Form.Item>
                                    ) : null}
                                </td>
                                <td className="border p-1">
                                    <Form.Item
                                        name="hO8No9fHVd2"
                                        className="m-0"
                                    >
                                        <InputNumber
                                            min={1}
                                            size="large"
                                            disabled={
                                                store.viewMode ||
                                                store.allDisabled.hO8No9fHVd2
                                            }
                                        />
                                    </Form.Item>
                                </td>
                            </tr>

                            <tr>
                                <td className="border p-1">
                                    <b>d</b>
                                </td>
                                <td className="border p-1">
                                    <ICDField
                                        id="icdField4"
                                        enableAltText={(value: boolean) => {
                                            toggleEnableAltSearch("d", value);
                                        }}
                                        next="cmZrrHfTxW3"
                                        dvalue={form.getFieldValue("CnPGhOcERFF")}
                                        disabled={store.allDisabled.CnPGhOcERFF}
                                        form={form}
                                        field="CnPGhOcERFF"
                                        searchQueryField="Op5pSvgHo1M"
                                        codeField="IeS8V8Yf40N"
                                        uriField="S53kx50gjQn"
                                        key={DKey}
                                        addUnderlyingCause={(
                                            value: any,
                                            title?: any,
                                            uri?: any
                                        ) => {
                                            editUnderlyingCauses(
                                                "d",
                                                title ? title : null,
                                                value,
                                                uri ? uri : null
                                            );
                                        }}
                                        resetUnderlyingCauseDropdown={
                                            setUnderlyingCauseKey
                                        }
                                    />
                                </td>
                                <td className="border p-1">
                                    <Form.Item
                                        name="IeS8V8Yf40N"
                                        className="m-0"
                                    >
                                        <Input
                                            readOnly={true}
                                            size="large"
                                            disabled={
                                                store.viewMode ||
                                                store.allDisabled.IeS8V8Yf40N
                                            }
                                        />
                                    </Form.Item>
                                </td>
                                <td className="border p-1">
                                    <Form.Item
                                        name="Op5pSvgHo1M"
                                        className="m-0"
                                    >
                                        <table>
                                            <tbody>
                                                <tr>
                                                    <td>
                                                        <Input
                                                            size="large"
                                                            // disabled={
                                                            //     store.viewMode ||
                                                            //     store.allDisabled
                                                            //         .Op5pSvgHo1M
                                                            // }
                                                            disabled={!!form.getFieldValue('IeS8V8Yf40N')} // Disable when code exists
                                                            value={testVal4}
                                                            onChange={(e: any) => {
                                                                setTestVal4(
                                                                    e.target.value
                                                                );
                                                                editUnderlyingCauses(
                                                                    "d",
                                                                    e.target.value
                                                                );
                                                            }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <Popconfirm
                                                            title={
                                                                activeLanguage.lang[
                                                                "Sure to add coded COD"
                                                                ]
                                                            }
                                                            onConfirm={() => {
                                                                buttonD();

                                                                //   Enable the search field and disable this one
                                                                store.enableValue(
                                                                    "IeS8V8Yf40N"
                                                                );
                                                                store.enableValue(
                                                                    "CnPGhOcERFF"
                                                                );
                                                                store.disableValue(
                                                                    "Op5pSvgHo1M"
                                                                );
                                                                store.disableValue(
                                                                    "cmZrrHfTxW3"
                                                                );
                                                                form.setFieldsValue(
                                                                    {
                                                                        IeS8V8Yf40N: null,
                                                                    }
                                                                );
                                                                form.setFieldsValue(
                                                                    {
                                                                        CnPGhOcERFF: null,
                                                                    }
                                                                );

                                                                setTimeout(() => {
                                                                    //  Force rerender of icd field
                                                                    setDKey(
                                                                        Math.random()
                                                                    );
                                                                }, 200);
                                                            }}
                                                        >
                                                            <Button
                                                                name="btnFreeTextD"
                                                                size="large"
                                                            >
                                                                X
                                                            </Button>
                                                        </Popconfirm>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </Form.Item>
                                </td>
                                <td className="border p-1">
                                    {optionSets ? (
                                        <Form.Item
                                            name="cmZrrHfTxW3"
                                            className="m-0"
                                        >
                                            <Select size="large" placeholder="Select an option" disabled={store.viewMode || store.allDisabled.cmZrrHfTxW3}>
                                                <Option value="Minutes">{tr("Minutes")}</Option>
                                                <Option value="Hours">{tr("Hours")}</Option>
                                                <Option value="Days">{tr("Days")}</Option>
                                                <Option value="Weeks">{tr("Weeks")}</Option>
                                                <Option value="Months">{tr("Months")}</Option>
                                                <Option value="Years">{tr("Years")}</Option>
                                            </Select>
                                            {/* <Select placeholder="Select an option">
												<Option value="Minutes">Minutes</Option>
												<Option value="Hours">Hours</Option>
												<Option value="Days">Days</Option>
												<Option value="Weeks">Weeks</Option>
												<Option value="Months">Months</Option>
												<Option value="Years">Years</Option>
											</Select> */}
                                        </Form.Item>
                                    ) : null}
                                </td>
                                <td className="border p-1">
                                    <Form.Item
                                        name="eCVDO6lt4go"
                                        className="m-0"
                                    >
                                        <InputNumber
                                            min={1}
                                            size="large"
                                            disabled={
                                                store.viewMode ||
                                                store.allDisabled.eCVDO6lt4go
                                            }
                                        />
                                    </Form.Item>
                                </td>
                            </tr>


                            <tr>
                                <td className="border p-1" colSpan={2} rowSpan={5}>
                                    <b>
                                        {
                                            activeLanguage.lang[
                                            "Other significant conditions contributing to death (time intervals can be included in brackets after the condition)"
                                            ]
                                        }
                                    </b>
                                </td>
                                <td className="border p-1" colSpan={1}>
                                    <b>
                                        {
                                            activeLanguage.lang[
                                            "Other 1"
                                            ] ?? "Other 1"
                                        }
                                    </b>
                                </td>
                                <td className="border p-1" colSpan={2}>
                                    <ICDField
                                        id="icdField5"
                                        form={form}
                                        field="xeE5TQLvucB"
                                        codeField="ctbKSNV2cg7"
                                        uriField="T4uxg60Lalw"
                                        addUnderlyingCause={(
                                            value: any,
                                            title?: any,
                                            uri?: any
                                        ) => {
                                            setDorisFields();
                                        }}
                                    />
                                </td>
                                <td className="border p-1" colSpan={2}>
                                    <Form.Item
                                        name="ctbKSNV2cg7"
                                        className="m-0"
                                    >
                                        <Input
                                            readOnly={true}
                                            size="large"
                                            disabled={
                                                store.viewMode ||
                                                store.allDisabled.TRu1GOUwtq5
                                            }
                                        />
                                    </Form.Item>

                                    <Form.Item
                                        name="T4uxg60Lalw"
                                        className="m-0"
                                    >
                                        <Input
                                            type="hidden"
                                            size="small"
                                            disabled={
                                                store.viewMode ||
                                                store.allDisabled.T4uxg60Lalw
                                            }
                                        />
                                    </Form.Item>
                                </td>

                            </tr>
                            <tr>
                                <td className="border p-1" colSpan={1}>
                                    <b>
                                        {
                                            activeLanguage.lang[
                                            "Other 2"
                                            ] ?? "Other 2"
                                        }
                                    </b>
                                </td>
                                <td className="border p-1" colSpan={2}>
                                    <ICDField
                                        id="icdField6"
                                        form={form}
                                        field="mI0UjQioE7E"
                                        codeField="krhrEBwJeNC"
                                        uriField=""
                                        addUnderlyingCause={(
                                            value: any,
                                            title?: any,
                                            uri?: any
                                        ) => {
                                            setDorisFields();
                                        }}
                                    />
                                </td>
                                <td className="border p-1" colSpan={2}>
                                    <Form.Item
                                        name="krhrEBwJeNC"
                                        className="m-0"
                                    >
                                        <Input
                                            readOnly={true}
                                            size="large"
                                            disabled={
                                                store.viewMode ||
                                                store.allDisabled.krhrEBwJeNC
                                            }
                                        />
                                    </Form.Item>
                                </td>

                            </tr>

                            <tr>
                                <td className="border p-1" colSpan={1}>
                                    <b>
                                        {
                                            activeLanguage.lang[
                                            "Other 3"
                                            ] ?? "Other 3"
                                        }
                                    </b>
                                </td>
                                <td className="border p-1" colSpan={2}>
                                    <ICDField
                                        id="icdField7"
                                        form={form}
                                        field="u5ebhwtAmpU"
                                        codeField="ZKtS7L49Poo"
                                        uriField=""
                                        addUnderlyingCause={(
                                            value: any,
                                            title?: any,
                                            uri?: any
                                        ) => {
                                            setDorisFields();
                                        }}
                                    />
                                </td>
                                <td className="border p-1" colSpan={2}>
                                    <Form.Item
                                        name="ZKtS7L49Poo"
                                        className="m-0"
                                    >
                                        <Input
                                            readOnly={true}
                                            size="large"
                                            disabled={
                                                store.viewMode ||
                                                store.allDisabled.ZKtS7L49Poo
                                            }
                                        />
                                    </Form.Item>
                                </td>

                            </tr>

                            <tr>
                                <td className="border p-1" colSpan={1}>
                                    <b>
                                        {
                                            activeLanguage.lang[
                                            "Other 4"
                                            ] ?? "Other 4"
                                        }
                                    </b>
                                </td>
                                <td className="border p-1" colSpan={2}>
                                    <ICDField
                                        id="icdField8"
                                        form={form}
                                        field="OxJgcwH15L7"
                                        codeField="fJDDc9mlubU"
                                        uriField=""
                                        addUnderlyingCause={(
                                            value: any,
                                            title?: any,
                                            uri?: any
                                        ) => {
                                            setDorisFields();
                                        }}
                                    />
                                </td>
                                <td className="border p-1" colSpan={2}>
                                    <Form.Item
                                        name="fJDDc9mlubU"
                                        className="m-0"
                                    >
                                        <Input
                                            readOnly={true}
                                            size="large"
                                            disabled={
                                                store.viewMode ||
                                                store.allDisabled.fJDDc9mlubU
                                            }
                                        />
                                    </Form.Item>
                                </td>

                            </tr>

                            <tr>
                                <td className="border p-1" colSpan={1}>
                                    <b>
                                        {
                                            activeLanguage.lang[
                                            "Other 5"
                                            ] ?? "Other 5"
                                        }
                                    </b>
                                </td>
                                <td className="border p-1" colSpan={2}>
                                    <ICDField
                                        id="icdField9"
                                        form={form}
                                        field="Zrn8LD3LoKY"
                                        codeField="z89Wr84V2G6"
                                        uriField=""
                                        addUnderlyingCause={(
                                            value: any,
                                            title?: any,
                                            uri?: any
                                        ) => {
                                            setDorisFields();
                                        }}
                                    />
                                </td>
                                <td className="border p-1" colSpan={2}>
                                    <Form.Item
                                        name="z89Wr84V2G6"
                                        className="m-0"
                                    >
                                        <Input
                                            readOnly={true}
                                            size="large"
                                            disabled={
                                                store.viewMode ||
                                                store.allDisabled.z89Wr84V2G6
                                            }
                                        />
                                    </Form.Item>
                                </td>

                            </tr>

                            <tr style={{ display: 'none' }}>
                                <td className="border p-1" colSpan={2}>
                                    <b>
                                        {
                                            activeLanguage.lang[
                                            "State the underlying cause"
                                            ]
                                        }
                                    </b>
                                </td>
                                <td className="border p-1" colSpan={2}>
                                    {/* Testing */}
                                    {/* {optionSets ? <Form.Item
                                  rules={[{ required: true, message: 'Select the underlying cause'}]}
                                    name="QTKk2Xt8KDu"
                                    className="m-0"
                                  >

                                    {optionSet('100U', 'QTKk2Xt8KDu')}
                                  </Form.Item> : null} */}

                                    {
                                        <Tooltip
                                            title={
                                                activeLanguage.lang[
                                                "NOTE: any values whose code begins with N are injuries and as such cannot be selected as an underlying cause of death."
                                                ]
                                            }
                                            visible={showBlackListWarning}
                                            style={{
                                                background: "#fff",
                                                color: "#000",
                                            }}
                                        >
                                            {editing ? (
                                                <Select
                                                    key={underlyingCauseKey}
                                                    style={{ width: "100%" }}
                                                    size="large"
                                                    value={underlyingCauseText}
                                                    disabled={store.viewMode || true || !!underlyingCauseText}
                                                    onDropdownVisibleChange={(
                                                        change
                                                    ) => {
                                                        // Inform user if any blacklisted values were found

                                                        if (
                                                            change === true &&
                                                            blackListedFound &&
                                                            !showBlackListWarning
                                                        ) {
                                                            setShowBlackListWarning(
                                                                true
                                                            );

                                                            // Hide the popup after 8 seconds
                                                            let timeout = setTimeout(
                                                                () => {
                                                                    setShowBlackListWarning(
                                                                        false
                                                                    );
                                                                },
                                                                8000
                                                            );

                                                            setTimeoutToClosePopup(
                                                                timeout
                                                            );
                                                        }
                                                        if (
                                                            !change &&
                                                            showBlackListWarning
                                                        ) {
                                                            setShowBlackListWarning(
                                                                false
                                                            );

                                                            if (
                                                                timeoutToClosePopup
                                                            ) {
                                                                clearTimeout(
                                                                    timeoutToClosePopup
                                                                );
                                                            }
                                                        }
                                                    }}
                                                    onChange={(e: any) => {
                                                        // console.log("Changing the underlying cause", e);
                                                        setUnderlyingCauseChosen(
                                                            true
                                                        );
                                                        addDiseaseTitle(e);
                                                    }}
                                                >
                                                    {Object.keys(
                                                        underlyingCauses
                                                    ).map((option: any) => {
                                                        if (
                                                            option.includes(
                                                                "disease"
                                                            ) === false &&
                                                            blacklistedValues.includes(
                                                                underlyingCauses[
                                                                `diseaseTitle${option.toUpperCase()}`
                                                                ][0]
                                                            ) === false
                                                        ) {
                                                            return (
                                                                <Option
                                                                    key={Math.random()}
                                                                    value={
                                                                        underlyingCauses[
                                                                        option
                                                                        ]
                                                                    }
                                                                >
                                                                    {`(${option}) ${underlyingCauses[
                                                                            option
                                                                        ]
                                                                            ? underlyingCauses[
                                                                            option
                                                                            ]
                                                                            : ""
                                                                        }`}
                                                                </Option>
                                                            );
                                                        } else if (
                                                            option.includes(
                                                                "disease"
                                                            ) === false &&
                                                            blacklistedValues.includes(
                                                                underlyingCauses[
                                                                `diseaseTitle${option.toUpperCase()}`
                                                                ][0]
                                                            ) === true &&
                                                            !blackListedFound
                                                        ) {
                                                            setBlackListedFound(
                                                                true
                                                            );
                                                        }
                                                    })}
                                                </Select>
                                            ) : (
                                                <Select
                                                    key={underlyingCauseKey}
                                                    style={{ width: "100%" }}
                                                    size="large"
                                                    value={underlyingCauseText}
                                                    disabled={store.viewMode}
                                                    onDropdownVisibleChange={(
                                                        change
                                                    ) => {
                                                        // Inform user if any blacklisted values were found

                                                        if (
                                                            change === true &&
                                                            blackListedFound &&
                                                            !showBlackListWarning
                                                        ) {
                                                            setShowBlackListWarning(
                                                                true
                                                            );

                                                            // Hide the popup after 8 seconds
                                                            let timeout = setTimeout(
                                                                () => {
                                                                    setShowBlackListWarning(
                                                                        false
                                                                    );
                                                                },
                                                                8000
                                                            );

                                                            setTimeoutToClosePopup(
                                                                timeout
                                                            );
                                                        }
                                                        if (
                                                            !change &&
                                                            showBlackListWarning
                                                        ) {
                                                            setShowBlackListWarning(
                                                                false
                                                            );

                                                            if (
                                                                timeoutToClosePopup
                                                            ) {
                                                                clearTimeout(
                                                                    timeoutToClosePopup
                                                                );
                                                            }
                                                        }
                                                    }}
                                                    onChange={(e: any) => {
                                                        // console.log("Changing the underlying cause", e);
                                                        setUnderlyingCauseChosen(
                                                            true
                                                        );
                                                        addDiseaseTitle(e);
                                                    }}
                                                >
                                                    {Object.keys(
                                                        underlyingCauses
                                                    ).map((option: any) => {
                                                        if (
                                                            option.includes(
                                                                "disease"
                                                            ) === false &&
                                                            blacklistedValues.includes(
                                                                underlyingCauses[
                                                                `diseaseTitle${option.toUpperCase()}`
                                                                ][0]
                                                            ) === false
                                                        ) {
                                                            return (
                                                                <Option
                                                                    key={Math.random()}
                                                                    value={
                                                                        underlyingCauses[
                                                                        option
                                                                        ]
                                                                    }
                                                                >
                                                                    {`(${option}) ${underlyingCauses[
                                                                            option
                                                                        ]
                                                                            ? underlyingCauses[
                                                                            option
                                                                            ]
                                                                            : ""
                                                                        }`}
                                                                </Option>
                                                            );
                                                        } else if (
                                                            option.includes(
                                                                "disease"
                                                            ) === false &&
                                                            blacklistedValues.includes(
                                                                underlyingCauses[
                                                                `diseaseTitle${option.toUpperCase()}`
                                                                ][0]
                                                            ) === true &&
                                                            !blackListedFound
                                                        ) {
                                                            setBlackListedFound(
                                                                true
                                                            );
                                                        }
                                                    })}
                                                </Select>
                                            )}
                                        </Tooltip>
                                    }
                                    {/* End of Testing */}
                                </td>
                                <td className="border p-1" colSpan={1}>
                                    <Form.Item
                                        name="dTd7txVzhgY"
                                        className="m-0"
                                    >
                                        <table>
                                            <tbody>
                                                <tr>
                                                    <td></td>
                                                    <td>
                                                        <Input
                                                            readOnly
                                                            size="large"
                                                            disabled={
                                                                store.viewMode ||
                                                                store.allDisabled
                                                                    .dTd7txVzhgY
                                                            }
                                                            value={
                                                                underlyingCauseCode
                                                            }
                                                        />
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </Form.Item>
                                </td>
                                <td className="border p-1" colSpan={2}>
                                    <Form.Item
                                        name="L97MrANAav9"
                                        className="m-0"
                                    >
                                        <Input
                                            type="hidden"
                                            size="large"
                                            disabled={
                                                store.viewMode ||
                                                store.allDisabled.L97MrANAav9
                                            }
                                        />
                                    </Form.Item>
                                </td>
                            </tr>

                            <>
                                <tr style={{ display: 'none' }}>
                                    <td className="border p-1" colSpan={2}>
                                        <b>
                                            {tr("Doris Underlying Cause")}
                                        </b>
                                    </td>
                                    <td className="border p-1" colSpan={2}>
                                        <Form.Item
                                            name="tKezaEs8Ez5"
                                            className="m-0"
                                        >
                                            <Input
                                                type="text"
                                                size="large"
                                                disabled={
                                                    store.viewMode ||
                                                    store.allDisabled.tKezaEs8Ez5
                                                }
                                            />
                                        </Form.Item>

                                    </td>
                                    <td className="border p-1" colSpan={1}>
                                        <Form.Item
                                            name="LAvyxs29laJ"
                                            className="m-0"
                                        >
                                            <Input
                                                type="text"
                                                size="large"
                                                disabled={
                                                    store.viewMode ||
                                                    store.allDisabled.LAvyxs29laJ
                                                }
                                            />
                                        </Form.Item>
                                    </td>
                                    <td className="border p-1" colSpan={2}>
                                        {!!dorisReport && (
                                            <DorisReportModal report={dorisReport} />
                                        )}
                                    </td>
                                </tr>


                                <tr>
                                    <td className="border p-1" colSpan={2}>
                                        <b>
                                            {tr("Final Underlying Cause")}
                                        </b>
                                    </td>
                                    <td className="border p-1" colSpan={2}>
                                        <Form.Item
                                            name="mQVAyOLbga1"
                                            className="m-0"
                                        >

                                            <Select
                                                size="large"
                                                placeholder="Select Final Underlying Cause"
                                                disabled={store.viewMode || store.allDisabled.mQVAyOLbga1}
                                            >
                                                {Object.entries(finalCauseOptions as Record<string, string>).map(([code, text]) => {
                                                    const label = text ?? "";
                                                    return (
                                                        <Select.Option key={code} value={label}>
                                                            {`${label} (${code})`}
                                                        </Select.Option>
                                                    );
                                                })}
                                            </Select>



                                            {/*<Input*/}
                                            {/*    type="text"*/}
                                            {/*    size="large"*/}
                                            {/*    disabled={*/}
                                            {/*        store.viewMode ||*/}
                                            {/*        store.allDisabled.mQVAyOLbga1*/}
                                            {/*    }*/}
                                            {/*/>*/}
                                        </Form.Item>

                                    </td>
                                    <td className="border p-1" colSpan={1}>
                                        <Form.Item
                                            name="n2mScmFMovq"
                                            className="m-0"
                                        >
                                            <Input
                                                type="text"
                                                size="large"
                                                disabled={
                                                    store.viewMode ||
                                                    store.allDisabled.n2mScmFMovq
                                                }
                                            />
                                        </Form.Item>
                                    </td>
                                    <td className="border p-1" colSpan={2}>
                                        {!!dorisReport && (
                                            <DorisReportModal report={dorisReport} />
                                        )}
                                    </td>
                                </tr>


                                {/*<tr>*/}
                                {/*    <td className="border p-1" colSpan={2}>*/}
                                {/*        <b>*/}
                                {/*            {tr("Final Underlying Cause")}*/}
                                {/*        </b>*/}
                                {/*    </td>*/}
                                {/*    <td className="border p-1" colSpan={2}>*/}
                                {/*        <Form.Item*/}
                                {/*            name="mQVAyOLbga1"*/}
                                {/*            className="m-0"*/}
                                {/*        >*/}
                                {/*            <Select*/}
                                {/*                size="large"*/}
                                {/*                disabled={*/}
                                {/*                    store.viewMode ||*/}
                                {/*                    store.allDisabled.mQVAyOLbga1*/}
                                {/*                }*/}
                                {/*                onChange={(s) => {*/}
                                {/*                    const finalc = Object.keys(finalCauseOptions).find(key => finalCauseOptions[key] === s)*/}
                                {/*                    form.setFieldsValue({n2mScmFMovq: finalc});*/}
                                {/*                }}*/}
                                {/*            >*/}
                                {/*                {Object.values(finalCauseOptions).filter(o => !!o).map((opt: any) => (*/}
                                {/*                    <Option key={opt} value={opt}>{opt}</Option>*/}
                                {/*                ))}*/}
                                {/*            </Select>*/}
                                {/*        </Form.Item>*/}

                                {/*    </td>*/}
                                {/*    <td className="border p-1" colSpan={1}>*/}
                                {/*        <Form.Item*/}
                                {/*            name="n2mScmFMovq"*/}
                                {/*            className="m-0"*/}
                                {/*        >*/}
                                {/*            <Input*/}
                                {/*                type="text"*/}
                                {/*                size="large"*/}
                                {/*                disabled={*/}
                                {/*                    store.viewMode ||*/}
                                {/*                    store.allDisabled.n2mScmFMovq*/}
                                {/*                }*/}
                                {/*            />*/}
                                {/*        </Form.Item>*/}
                                {/*    </td>*/}
                                {/*    <td className="border p-1" colSpan={2}>*/}

                                {/*    </td>*/}
                                {/*</tr>*/}
                            </>


                            <tr>
                                <td>
                                    <Form.Item
                                        name="k9xdBQzYMXo"
                                        className="m-0"
                                    >
                                        <Input
                                            size="large"
                                            disabled={store.viewMode}
                                            type="hidden"
                                        />
                                    </Form.Item>
                                </td>
                                <td>
                                    <Form.Item
                                        name="yftBZ5bSEOb"
                                        className="m-0"
                                    >
                                        <Input
                                            size="large"
                                            disabled={store.viewMode}
                                            type="hidden"
                                        />
                                    </Form.Item>
                                </td>

                                <td>
                                    <Form.Item
                                        name="fJUy96o8akn"
                                        className="m-0"
                                    >
                                        <Input
                                            size="large"
                                            disabled={store.viewMode}
                                            type="hidden"
                                        />
                                    </Form.Item>
                                </td>
                                <td>
                                    <Form.Item
                                        name="S53kx50gjQn"
                                        className="m-0"
                                    >
                                        <Input
                                            size="large"
                                            disabled={store.viewMode}
                                            type="hidden"
                                        />
                                    </Form.Item>
                                </td>

                                <td>
                                    <Form.Item
                                        name="CPq2mkKL98T"
                                        className="m-0"
                                    >
                                        <Input
                                            size="large"
                                            disabled={store.viewMode}
                                            type="hidden"
                                        />
                                    </Form.Item>
                                </td>

                                <td>
                                    <Form.Item
                                        name="cSDJ9kSJkFP"
                                        className="m-0"
                                    >
                                        <Input
                                            size="large"
                                            disabled={store.viewMode}
                                            type="hidden"
                                        />
                                    </Form.Item>
                                </td>
                                <td>
                                    <Form.Item
                                        name="uckvenVFnwf"
                                        className="m-0"
                                    >
                                        <Input
                                            size="large"
                                            disabled={store.viewMode}
                                            type="hidden"
                                        />
                                    </Form.Item>
                                </td>

                                <td>
                                    <Form.Item
                                        name="ZFdJRT3PaUd"
                                        className="m-0"
                                    >
                                        <Input
                                            size="large"
                                            disabled={store.viewMode}
                                            type="hidden"
                                        />
                                    </Form.Item>
                                </td>

                                <td>
                                    <Form.Item
                                        name="Op5pSvgHo1M"
                                        className="m-0"
                                    >
                                        <Input
                                            size="large"
                                            disabled={store.viewMode}
                                            type="hidden"
                                        />
                                    </Form.Item>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <table className="my-2 w-full border-collapse px-2"
                        style={{ ...(notifyx ? ({ display: "none" }) : ({})) }}>
                        <tbody>
                            <tr>
                                <td
                                    colSpan={2}
                                    className="border p-1 text-lg"
                                    style={{ background: titleBackgroundColor }}
                                >
                                    <h3
                                        style={{
                                            fontWeight: "bolder",
                                            color: "#000085",
                                        }}
                                    >
                                        {" "}
                                        {
                                            activeLanguage.lang[
                                            "Frame B: Other medical data"
                                            ]
                                        }
                                    </h3>
                                </td>
                            </tr>
                            <tr>
                                <td className="border p-1">
                                    <b>
                                        {
                                            activeLanguage.lang[
                                            "Was surgery performed within the last 4 weeks?"
                                            ]
                                        }
                                    </b>
                                </td>
                                <td className="border p-1">
                                    {optionSets ? (
                                        <Form.Item
                                            name="Kk0hmrJPR90"
                                            className="m-0"
                                        >
                                            {optionSet(
                                                "YN01",
                                                "Kk0hmrJPR90",
                                                (e: any) => {
                                                    if (e !== "Yes") {
                                                        // Disable the relevant fields
                                                        setDisableFrameB(true);
                                                        setFrameBKey1(
                                                            `${parseInt(
                                                                frameBKey1
                                                            ) + 1
                                                            }`
                                                        );
                                                        setFrameBKey2(
                                                            `${parseInt(
                                                                frameBKey2
                                                            ) + 2
                                                            }`
                                                        );
                                                    } else {
                                                        setDisableFrameB(false);
                                                        setFrameBKey1(
                                                            `${parseInt(
                                                                frameBKey1
                                                            ) + 1
                                                            }`
                                                        );
                                                        setFrameBKey2(
                                                            `${parseInt(
                                                                frameBKey2
                                                            ) + 2
                                                            }`
                                                        );
                                                    }
                                                }
                                            )}
                                        </Form.Item>
                                    ) : null}
                                </td>
                            </tr>
                            <tr>
                                <td className="border p-1">
                                    <b>
                                        {
                                            activeLanguage.lang[
                                            "If yes please specify date of surgery"
                                            ]
                                        }
                                    </b>
                                </td>
                                <td className="border p-1">
                                    <Form.Item
                                        name="j5TIQx3gHyF"
                                        className="m-0"

                                    >
                                        <DatePicker
                                            disabledDate={notTomorrow}
                                            size="large"
                                            // disabled={false}
                                            disabled={form.getFieldValue('Kk0hmrJPR90') === 'No' || form.getFieldValue('Kk0hmrJPR90') === 'Unknown'}
                                            key={frameBKey1}
                                        // value={store.defaultValues.j5TIQx3gHyF?._d==="invalid"}
                                        />
                                    </Form.Item>
                                </td>
                            </tr>

                            <tr>
                                <td className="border p-1">
                                    <b>
                                        {
                                            activeLanguage.lang[
                                            "If yes please specify reason for surgery (disease or condition)"
                                            ]
                                        }
                                    </b>
                                </td>
                                <td className="border p-1">
                                    <Form.Item
                                        name="JhHwdQ337nn"
                                        className="m-0"
                                    >
                                        <Input
                                            size="large"
                                            // disabled={false}
                                            disabled={form.getFieldValue('Kk0hmrJPR90') === 'No' || form.getFieldValue('Kk0hmrJPR90') === 'Unknown'}
                                            key={frameBKey2}
                                        />
                                    </Form.Item>
                                </td>
                            </tr>
                            <tr>
                                <td className="border p-1">
                                    <b>
                                        {
                                            activeLanguage.lang[
                                            "Was an autopsy requested?"
                                            ]
                                        }
                                    </b>
                                </td>
                                <td className="border p-1">
                                    {optionSets ? (
                                        <Form.Item
                                            name="jY3K6Bv4o9Q"
                                            className="m-0"
                                        >
                                            {optionSet(
                                                "YN01",
                                                "jY3K6Bv4o9Q",
                                                (e: any) => {
                                                    console.log(
                                                        "Resetting frameBKey3",
                                                        frameBKey3
                                                    );
                                                    if (e !== "Yes") {
                                                        setDisableFrameB2(true);
                                                    } else {
                                                        setDisableFrameB2(
                                                            false
                                                        );
                                                    }

                                                    setFrameBKey3(
                                                        `${parseInt(
                                                            frameBKey3
                                                        ) + 3
                                                        }`
                                                    );
                                                }
                                            )}
                                        </Form.Item>
                                    ) : null}
                                </td>
                            </tr>
                            <tr style={{ display: form.getFieldValue('jY3K6Bv4o9Q') === 'Yes' ? '' : 'none' }}>
                                <td className="border p-1">
                                    <b>
                                        {
                                            activeLanguage.lang[
                                            "If yes were the findings used in the certification?"
                                            ]
                                        }
                                    </b>
                                </td>
                                <td className="border p-1">
                                    {optionSets ? (
                                        <Form.Item
                                            name="UfG52s4YcUt"
                                            className="m-0"

                                        >
                                            {optionSet(
                                                "YN01",
                                                "UfG52s4YcUt",
                                                (e: any) => {

                                                },
                                                disableFrameB2,
                                                frameBKey3
                                            )}
                                        </Form.Item>
                                    ) : null}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <table className="my-2 w-full border-collapse px-2">
                        <tbody>
                            <tr>
                                <td
                                    colSpan={6}
                                    className="border p-1 text-lg"
                                    style={{ background: titleBackgroundColor }}
                                >
                                    <h3
                                        style={{
                                            fontWeight: "bolder",
                                            color: "#000085",
                                        }}
                                    >
                                        <b>
                                            {
                                                activeLanguage.lang[
                                                "Manner of death"
                                                ]
                                            }
                                        </b>
                                    </h3>
                                </td>
                            </tr>
                            <tr>
                                <td className="border p-1">
                                    <b>{activeLanguage.lang["Disease"]}</b>
                                </td>
                                <td className="border p-1">
                                    <Form.Item
                                        name="FhHPxY16vet"
                                        className="m-0"
                                        valuePropName="checked"
                                    >
                                        <Checkbox
                                            disabled={
                                                store.viewMode ||
                                                store.allDisabled.FhHPxY16vet ||
                                                (form.getFieldValue("KsGOxFyzIs1") ||
                                                    form.getFieldValue("b4yPk98om7e") ||
                                                    form.getFieldValue("gNM2Yhypydx") ||
                                                    form.getFieldValue("tYH7drlbNya") ||
                                                    form.getFieldValue("fQWuywOaoN2") ||
                                                    form.getFieldValue("wX3i3gkTG4m") ||
                                                    form.getFieldValue("xDMX2CJ4Xw3") ||
                                                    form.getFieldValue("o1hG9vr0peF"))
                                            }
                                        >
                                            {activeLanguage.lang["Yes"]}
                                        </Checkbox>
                                    </Form.Item>
                                </td>
                                <td className="border p-1">
                                    <b>{activeLanguage.lang["Assault"]}</b>
                                </td>
                                <td className="border p-1">
                                    <Form.Item
                                        name="KsGOxFyzIs1"
                                        className="m-0"
                                        valuePropName="checked"
                                    >
                                        <Checkbox
                                            disabled={
                                                store.viewMode ||
                                                store.allDisabled.KsGOxFyzIs1 ||
                                                (form.getFieldValue("FhHPxY16vet") ||
                                                    form.getFieldValue("b4yPk98om7e") ||
                                                    form.getFieldValue("gNM2Yhypydx") ||
                                                    form.getFieldValue("tYH7drlbNya") ||
                                                    form.getFieldValue("fQWuywOaoN2") ||
                                                    form.getFieldValue("wX3i3gkTG4m") ||
                                                    form.getFieldValue("xDMX2CJ4Xw3") ||
                                                    form.getFieldValue("o1hG9vr0peF"))
                                            }
                                        >
                                            {activeLanguage.lang["Yes"]}
                                        </Checkbox>
                                    </Form.Item>
                                </td>
                                <td className="border p-1">
                                    <b>
                                        {
                                            activeLanguage.lang[
                                            "Could not be determined"
                                            ]
                                        }
                                    </b>{" "}
                                </td>
                                <td className="border p-1">
                                    <Form.Item
                                        name="b4yPk98om7e"
                                        className="m-0"
                                        valuePropName="checked"
                                    >
                                        <Checkbox
                                            disabled={
                                                store.viewMode ||
                                                store.allDisabled.b4yPk98om7e ||
                                                (form.getFieldValue("FhHPxY16vet") ||
                                                    form.getFieldValue("KsGOxFyzIs1") ||
                                                    form.getFieldValue("gNM2Yhypydx") ||
                                                    form.getFieldValue("tYH7drlbNya") ||
                                                    form.getFieldValue("fQWuywOaoN2") ||
                                                    form.getFieldValue("wX3i3gkTG4m") ||
                                                    form.getFieldValue("xDMX2CJ4Xw3") ||
                                                    form.getFieldValue("o1hG9vr0peF"))
                                            }
                                        >
                                            {activeLanguage.lang["Yes"]}
                                        </Checkbox>
                                    </Form.Item>
                                </td>
                            </tr>
                            <tr>
                                <td className="border p-1">
                                    <b>Accident</b>
                                </td>
                                <td className="border p-1">
                                    <Form.Item
                                        name="gNM2Yhypydx"
                                        className="m-0"
                                        valuePropName="checked"
                                    >
                                        <Checkbox
                                            disabled={
                                                store.viewMode ||
                                                store.allDisabled.gNM2Yhypydx ||
                                                (form.getFieldValue("FhHPxY16vet") ||
                                                    form.getFieldValue("KsGOxFyzIs1") ||
                                                    form.getFieldValue("b4yPk98om7e") ||
                                                    form.getFieldValue("tYH7drlbNya") ||
                                                    form.getFieldValue("fQWuywOaoN2") ||
                                                    form.getFieldValue("wX3i3gkTG4m") ||
                                                    form.getFieldValue("xDMX2CJ4Xw3") ||
                                                    form.getFieldValue("o1hG9vr0peF"))
                                            }
                                        >
                                            {activeLanguage.lang["Yes"]}
                                        </Checkbox>
                                    </Form.Item>
                                </td>
                                <td className="border p-1">
                                    <b>
                                        {
                                            activeLanguage.lang[
                                            "Legal intervention"
                                            ]
                                        }
                                    </b>
                                </td>
                                <td className="border p-1">
                                    <Form.Item
                                        name="tYH7drlbNya"
                                        className="m-0"
                                        valuePropName="checked"
                                    >
                                        <Checkbox
                                            disabled={
                                                store.viewMode ||
                                                store.allDisabled.tYH7drlbNya ||
                                                (form.getFieldValue("FhHPxY16vet") ||
                                                    form.getFieldValue("KsGOxFyzIs1") ||
                                                    form.getFieldValue("b4yPk98om7e") ||
                                                    form.getFieldValue("gNM2Yhypydx") ||
                                                    form.getFieldValue("fQWuywOaoN2") ||
                                                    form.getFieldValue("wX3i3gkTG4m") ||
                                                    form.getFieldValue("xDMX2CJ4Xw3") ||
                                                    form.getFieldValue("o1hG9vr0peF"))
                                            }
                                        >
                                            {activeLanguage.lang["Yes"]}
                                        </Checkbox>
                                    </Form.Item>
                                </td>
                                <td className="border p-1">
                                    <b>
                                        {
                                            activeLanguage.lang[
                                            "Pending investigation"
                                            ]
                                        }
                                    </b>
                                </td>
                                <td className="border p-1">
                                    <Form.Item
                                        name="fQWuywOaoN2"
                                        className="m-0"
                                        valuePropName="checked"
                                    >
                                        <Checkbox
                                            disabled={
                                                store.viewMode ||
                                                store.allDisabled.fQWuywOaoN2 ||
                                                (form.getFieldValue("FhHPxY16vet") ||
                                                    form.getFieldValue("KsGOxFyzIs1") ||
                                                    form.getFieldValue("b4yPk98om7e") ||
                                                    form.getFieldValue("gNM2Yhypydx") ||
                                                    form.getFieldValue("tYH7drlbNya") ||
                                                    form.getFieldValue("wX3i3gkTG4m") ||
                                                    form.getFieldValue("xDMX2CJ4Xw3") ||
                                                    form.getFieldValue("o1hG9vr0peF"))
                                            }
                                        >
                                            {activeLanguage.lang["Yes"]}
                                        </Checkbox>
                                    </Form.Item>
                                </td>
                            </tr>
                            <tr>
                                <td className="border p-1">
                                    <b>
                                        {
                                            activeLanguage.lang[
                                            "Intentional self-harm"
                                            ]
                                        }
                                    </b>
                                </td>
                                <td className="border p-1">
                                    <Form.Item
                                        name="wX3i3gkTG4m"
                                        className="m-0"
                                        valuePropName="checked"
                                    >
                                        <Checkbox
                                            disabled={
                                                store.viewMode ||
                                                store.allDisabled.wX3i3gkTG4m ||
                                                (form.getFieldValue("FhHPxY16vet") ||
                                                    form.getFieldValue("KsGOxFyzIs1") ||
                                                    form.getFieldValue("b4yPk98om7e") ||
                                                    form.getFieldValue("gNM2Yhypydx") ||
                                                    form.getFieldValue("tYH7drlbNya") ||
                                                    form.getFieldValue("fQWuywOaoN2") ||
                                                    form.getFieldValue("xDMX2CJ4Xw3") ||
                                                    form.getFieldValue("o1hG9vr0peF"))
                                            }
                                        >
                                            {activeLanguage.lang["Yes"]}
                                        </Checkbox>
                                    </Form.Item>
                                </td>
                                <td className="border p-1">
                                    <b>{activeLanguage.lang["War"]}</b>
                                </td>
                                <td className="border p-1">
                                    <Form.Item
                                        name="xDMX2CJ4Xw3"
                                        className="m-0"
                                        valuePropName="checked"
                                    >
                                        <Checkbox
                                            disabled={
                                                store.viewMode ||
                                                store.allDisabled.xDMX2CJ4Xw3 ||
                                                (form.getFieldValue("FhHPxY16vet") ||
                                                    form.getFieldValue("KsGOxFyzIs1") ||
                                                    form.getFieldValue("b4yPk98om7e") ||
                                                    form.getFieldValue("gNM2Yhypydx") ||
                                                    form.getFieldValue("tYH7drlbNya") ||
                                                    form.getFieldValue("fQWuywOaoN2") ||
                                                    form.getFieldValue("wX3i3gkTG4m") ||
                                                    form.getFieldValue("o1hG9vr0peF"))
                                            }
                                        >
                                            {activeLanguage.lang["Yes"]}
                                        </Checkbox>
                                    </Form.Item>
                                </td>
                                <td className="border p-1">
                                    <b>{activeLanguage.lang["Unknown"]}</b>
                                </td>
                                <td className="border p-1">
                                    <Form.Item
                                        name="o1hG9vr0peF"
                                        className="m-0"
                                        valuePropName="checked"
                                    >
                                        <Checkbox
                                            disabled={
                                                store.viewMode ||
                                                store.allDisabled.o1hG9vr0peF ||
                                                (form.getFieldValue("FhHPxY16vet") ||
                                                    form.getFieldValue("KsGOxFyzIs1") ||
                                                    form.getFieldValue("b4yPk98om7e") ||
                                                    form.getFieldValue("gNM2Yhypydx") ||
                                                    form.getFieldValue("tYH7drlbNya") ||
                                                    form.getFieldValue("fQWuywOaoN2") ||
                                                    form.getFieldValue("wX3i3gkTG4m") ||
                                                    form.getFieldValue("xDMX2CJ4Xw3"))
                                            }
                                        >
                                            {activeLanguage.lang["Yes"]}
                                        </Checkbox>
                                    </Form.Item>
                                </td>
                            </tr>
                            <tr>
                                <td className="border p-1" colSpan={2}>
                                    <b>
                                        {
                                            activeLanguage.lang[
                                            "If external cause or poisoning"
                                            ]
                                        }
                                    </b>
                                </td>
                                <td className="border p-1">
                                    <Form.Item name="AZSlwlRAFig" className="m-0" valuePropName="checked">
                                        <Radio.Group
                                            disabled={
                                                store.viewMode ||
                                                store.allDisabled.AZSlwlRAFig ||
                                                form.getFieldValue("FhHPxY16vet")
                                            }
                                        >
                                            <Radio value="Yes">{activeLanguage.lang["Yes"]}</Radio>
                                            <Radio value="No">{activeLanguage.lang["No"]}</Radio>
                                        </Radio.Group>
                                    </Form.Item>
                                </td>
                                <td className="border p-1">
                                    <b>
                                        {activeLanguage.lang["Date of injury"]}
                                    </b>
                                </td>
                                <td className="border p-1" colSpan={2}>
                                    <Form.Item
                                        name="U18Tnfz9EKd"
                                        className="m-0"

                                    >
                                        <DatePicker
                                            disabledDate={notTomorrow}
                                            size="large"
                                            disabled={
                                                store.viewMode ||
                                                store.allDisabled.U18Tnfz9EKd ||
                                                form.getFieldValue("FhHPxY16vet")
                                            }
                                        />
                                    </Form.Item>
                                </td>
                            </tr>
                            <tr>
                                <td className="border p-1" colSpan={3}>
                                    <b>
                                        {
                                            activeLanguage.lang[
                                            "Please describe how external cause occurred (If poisoning please specify poisoning agent)"
                                            ]
                                        }
                                    </b>
                                </td>
                                <td className="border p-1" colSpan={3}>
                                    <Form.Item
                                        name="DKlOhZJOCrX"
                                        className="m-0"
                                    >
                                        <Input
                                            size="large"
                                            // disabled={
                                            //     store.viewMode ||
                                            //     store.allDisabled.DKlOhZJOCrX
                                            // }
                                            disabled={!form.getFieldValue('AZSlwlRAFig') || form.getFieldValue("FhHPxY16vet")}
                                        />
                                    </Form.Item>
                                </td>
                            </tr>
                            <tr>
                                <td className="border p-1" colSpan={3}>
                                    <b>
                                        {
                                            activeLanguage.lang[
                                            "Place of occurrence of the external cause"
                                            ]
                                        }
                                    </b>
                                </td>
                                <td className="border p-1" colSpan={3}>
                                    <Form.Item
                                        name="kGIDD5xIeLC"
                                        className="m-0"
                                    >
                                        <Input
                                            size="large"
                                            // disabled={
                                            //     store.viewMode ||
                                            //     store.allDisabled.kGIDD5xIeLC
                                            // }
                                            disabled={!form.getFieldValue('AZSlwlRAFig') || form.getFieldValue("FhHPxY16vet")}
                                        />
                                    </Form.Item>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    {
                        (personsAgeInDays <= 7 && personsAge < 1) && (
                            <table className="my-2 w-full border-collapse px-2"
                                style={{ ...(notifyx ? ({ display: "none" }) : ({})) }}>
                                <tbody>
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="border p-1 text-lg"
                                            style={{ background: titleBackgroundColor }}
                                        >
                                            <h3
                                                style={{
                                                    fontWeight: "bolder",
                                                    color: "#000085",
                                                }}
                                            >
                                                {
                                                    activeLanguage.lang[
                                                    "Fetal or infant death"
                                                    ]
                                                }
                                            </h3>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="border p-1" colSpan={2}>
                                            <b>
                                                Fetal or infant
                                            </b>
                                        </td>
                                        <td className="border p-1">
                                            {optionSets ? (

                                                <Form.Item
                                                    name="fetal"
                                                    className="m-0"
                                                >
                                                    <Select placeholder="Select an option"
                                                        disabled={personsAge >= 1} // Disable when age is 1 or more
                                                    >
                                                        <Option value="Fetal">Fetal</Option>
                                                        <Option value="Infant">Infant</Option>
                                                    </Select>
                                                </Form.Item>
                                            ) : null}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="border p-1" colSpan={2}>
                                            <b>
                                                {
                                                    activeLanguage.lang[
                                                    "Multiple pregnancy"
                                                    ]
                                                }
                                            </b>
                                        </td>
                                        <td className="border p-1" colSpan={2}>
                                            {optionSets ? (
                                                <Form.Item
                                                    name="V4rE1tsj5Rb"
                                                    className="m-0"
                                                >
                                                    {optionSet("YN01", "V4rE1tsj5Rb", null, personsAge > 1)}
                                                </Form.Item>
                                            ) : null}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="border p-1" colSpan={2}>
                                            <b>{activeLanguage.lang["Stillborn?"]}</b>
                                        </td>
                                        <td className="border p-1" colSpan={2}>
                                            {optionSets ? (
                                                <Form.Item
                                                    name="ivnHp4M4hFF"
                                                    className="m-0"
                                                >
                                                    {optionSet(
                                                        "YN01",
                                                        "ivnHp4M4hFF",
                                                        (e: any) => {
                                                            if (e === "Yes") {
                                                                // Disable the relevant fields
                                                                setDisableFetal(true);
                                                                setFetalDisableKey(
                                                                    `${parseInt(
                                                                        fetalDisableKey
                                                                    ) + 1
                                                                    }`
                                                                );
                                                            } else {
                                                                setDisableFetal(false);
                                                                setFetalDisableKey(
                                                                    `${parseInt(
                                                                        fetalDisableKey
                                                                    ) + 1
                                                                    }`
                                                                );
                                                            }
                                                        },
                                                        personsAge > 1 || form.getFieldValue("fetal") === "Infant"
                                                    )}
                                                </Form.Item>
                                            ) : null}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="border p-1">
                                            <b>
                                                {
                                                    activeLanguage.lang[
                                                    "If death within 24 hrs specify the number of hours survived"
                                                    ]
                                                }
                                            </b>
                                        </td>
                                        <td className="border p-1">
                                            <Form.Item
                                                name="jf9TogeSZpk"
                                                className="m-0"

                                            >

                                                <InputNumber
                                                    size="large"
                                                    disabled={false}
                                                    key={fetalDisableKey}
                                                />
                                            </Form.Item>
                                        </td>
                                        <td className="border p-1">
                                            <b>
                                                {
                                                    activeLanguage.lang[
                                                    "Birth weight (in grams)"
                                                    ]
                                                }
                                            </b>
                                        </td>
                                        <td className="border p-1">
                                            <Form.Item
                                                name="xAWYJtQsg8M"
                                                className="m-0"
                                            >
                                                <InputNumber
                                                    size="large"
                                                    max={5000}
                                                    disabled={
                                                        store.viewMode ||
                                                        store.allDisabled.xAWYJtQsg8M
                                                    }
                                                />
                                            </Form.Item>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="border p-1">
                                            <b>
                                                {
                                                    activeLanguage.lang[
                                                    "Number of completed weeks of pregnancy"
                                                    ]
                                                }
                                            </b>
                                        </td>
                                        <td className="border p-1">
                                            <Form.Item
                                                name="lQ1Byr04JTx"
                                                className="m-0"
                                            >
                                                <InputNumber
                                                    size="large"
                                                    max={40}
                                                    disabled={
                                                        store.viewMode ||
                                                        store.allDisabled.lQ1Byr04JTx
                                                    }
                                                />
                                            </Form.Item>

                                        </td>
                                        <td className="border p-1">
                                            <b>
                                                {
                                                    activeLanguage.lang[
                                                    "Age of mother (years)"
                                                    ]
                                                }
                                            </b>
                                        </td>
                                        <td className="border p-1">
                                            <Form.Item
                                                name="DdfDMFW4EJ9"
                                                className="m-0"
                                            >
                                                <InputNumber
                                                    min={10}
                                                    max={55}
                                                    size="large"
                                                    disabled={
                                                        store.viewMode ||
                                                        store.allDisabled.DdfDMFW4EJ9
                                                    }
                                                />
                                            </Form.Item>

                                        </td>
                                    </tr>

                                    <tr>
                                        <td className="border p-1" colSpan={2}>
                                            <b>
                                                {
                                                    activeLanguage.lang[
                                                    "If the death was perinatal, please state conditions of mother that affected the fetus and newborn"
                                                    ]
                                                }
                                            </b>{" "}
                                        </td>
                                        <td className="border p-1" colSpan={2}>
                                            <Form.Item
                                                name="GFVhltTCG8b"
                                                className="m-0"
                                            >
                                                <Input
                                                    size="large"
                                                    disabled={
                                                        store.viewMode ||
                                                        store.allDisabled.GFVhltTCG8b
                                                    }
                                                />
                                            </Form.Item>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        )
                    }


                    {

                        (personsGender === "Female") && personsAge >= 12 &&
                        personsAge <= 60 && (
                            <table className="my-2 w-full border-collapse px-2"
                                style={{ ...(notifyx ? ({ display: "none" }) : ({})) }}>
                                <tbody>
                                    <tr>
                                        <td
                                            className="border p-1 text-lg"
                                            style={{ background: titleBackgroundColor }}
                                        >
                                            <h3
                                                style={{
                                                    fontWeight: "bolder",
                                                    color: "#000085",
                                                }}
                                            >
                                                <b>
                                                    {
                                                        activeLanguage.lang[
                                                        "For women, was the deceased pregnant or within 6 weeks of delivery?"
                                                        ]
                                                    }
                                                </b>
                                                {showPregnancyReminder &&
                                                    personsGender === "Female" && (
                                                        <Alert
                                                            message={
                                                                activeLanguage.lang[
                                                                "Reminder"
                                                                ]
                                                            }
                                                            description={
                                                                activeLanguage.lang[
                                                                "Please Remember to fill in the section: For women, was the deceased pregnant or within 6 weeks of delivery?"
                                                                ]
                                                            }
                                                            type="error"
                                                            closable
                                                            showIcon
                                                            onClose={() => {
                                                                setShowPregnancyReminder(
                                                                    false
                                                                );
                                                            }}
                                                        />
                                                    )}
                                            </h3>
                                        </td>
                                        <td className="border p-1">
                                            {optionSets ? (
                                                <Form.Item
                                                    name="zcn7acUB6x1"
                                                    className="m-0"
                                                >
                                                    {optionSet(
                                                        "YN01",
                                                        "zcn7acUB6x1",
                                                        (e: any) => {
                                                            console.log("E is ", e);
                                                            setPregnancyStatus(e);
                                                            if (e === "Yes") {
                                                                // console.log("Setting pregnancy to true");
                                                                refreshAllPregnantKeys(
                                                                    true
                                                                );
                                                            } else {
                                                                // console.log("Setting pregnancy to false");
                                                                refreshAllPregnantKeys(
                                                                    false
                                                                );
                                                            }
                                                        },
                                                        !enablePregnantQn,
                                                        enablePregnantQnKey
                                                    )}
                                                </Form.Item>
                                            ) : null}
                                        </td>
                                    </tr>
                                    {pregnancyStatus === "Yes" && (
                                        <>
                                            <tr>
                                                <td className="border p-1">
                                                    <b>
                                                        {activeLanguage.lang["At what point?"]}
                                                    </b>
                                                </td>
                                                <td className="border p-1">
                                                    {optionSets ? (
                                                        <Form.Item
                                                            name="KpfvNQSsWIw"
                                                            className="m-0"
                                                        >
                                                            {optionSet(
                                                                "100ATPOINT",
                                                                "KpfvNQSsWIw",
                                                                () => {
                                                                },
                                                                store.viewMode,
                                                                pregnantKey1
                                                            )}
                                                        </Form.Item>
                                                    ) : null}
                                                </td>
                                            </tr>

                                            <tr>
                                                <td className="border p-1">
                                                    <b>
                                                        {
                                                            activeLanguage.lang[
                                                            "Did the pregnancy contribute to death?"
                                                            ]
                                                        }
                                                    </b>
                                                </td>
                                                <td className="border p-1">
                                                    {optionSets ? (
                                                        <Form.Item
                                                            name="AJAraEcfH63"
                                                            className="m-0"
                                                        >
                                                            {optionSet(
                                                                "YN01",
                                                                "AJAraEcfH63",
                                                                () => {
                                                                },
                                                                store.viewMode,
                                                                pregnantKey2
                                                            )}
                                                        </Form.Item>
                                                    ) : null}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="border p-1">
                                                    <b>{activeLanguage.lang["Parity"]}</b>
                                                </td>
                                                <td className="border p-1">
                                                    <Form.Item
                                                        name="ymyLrfEcYkD"
                                                        className="m-0"
                                                    >
                                                        <Input
                                                            size="large"
                                                            disabled={
                                                                store.viewMode ||
                                                                store.allDisabled.ymyLrfEcYkD
                                                            }
                                                            key={pregnantKey4}
                                                        />
                                                    </Form.Item>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="border p-1">
                                                    <b>
                                                        {
                                                            activeLanguage.lang[
                                                            "Mode of delivery"
                                                            ]
                                                        }
                                                    </b>
                                                </td>
                                                <td className="border p-1">
                                                    {optionSets ? (
                                                        <Form.Item
                                                            name="K5BDPJQk1BP"
                                                            className="m-0"
                                                        >
                                                            {optionSet(
                                                                "MD01",
                                                                "K5BDPJQk1BP",
                                                                () => {
                                                                },
                                                                store.viewMode,
                                                                pregnantKey5
                                                            )}
                                                        </Form.Item>
                                                    ) : null}
                                                </td>
                                            </tr>

                                            <tr>
                                                <td className="border p-1">
                                                    <b>
                                                        {
                                                            activeLanguage.lang[
                                                            "Place of delivery"
                                                            ]
                                                        }
                                                    </b>
                                                </td>
                                                <td className="border p-1">
                                                    {optionSets ? (
                                                        <Form.Item
                                                            name="Z41di0TRjIu"
                                                            className="m-0"
                                                        >
                                                            {optionSet(
                                                                "PD01",
                                                                "Z41di0TRjIu",
                                                                () => {
                                                                },
                                                                store.viewMode,
                                                                pregnantKey6
                                                            )}
                                                        </Form.Item>
                                                    ) : null}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="border p-1">
                                                    <b>
                                                        {
                                                            activeLanguage.lang[
                                                            "Delivered by skilled attendant"
                                                            ]
                                                        }
                                                    </b>
                                                </td>
                                                <td className="border p-1">
                                                    {optionSets ? (
                                                        <Form.Item
                                                            name="uaxjt0inPNF"
                                                            className="m-0"
                                                        >
                                                            {optionSet(
                                                                "YN01",
                                                                "uaxjt0inPNF",
                                                                () => {
                                                                },
                                                                store.viewMode,
                                                                pregnantKey7
                                                            )}
                                                        </Form.Item>
                                                    ) : null}
                                                </td>
                                            </tr>
                                        </>
                                    )}

                                </tbody>
                            </table>
                        )
                    }


                    <table className="my-2 w-full border-collapse px-2">
                        <tbody>
                            <tr>
                                <Declarations
                                    titleBackgroundColor={titleBackgroundColor}
                                    receiveOutput={handleDeclarationOutput}
                                    receiveOldData={declarationsDefault}
                                />
                            </tr>
                            <tr>
                                <td className="border p-1">
                                    <Row>
                                        <Col xs={24} md={9} className="border p-1">
                                            <b>{tr("Examined By")}</b>
                                        </Col>
                                        <Col xs={24} md={15} className="border p-1">
                                            <Form.Item
                                                name="PaoRZbokFWJ"
                                                className="m-0"
                                            >
                                                <Input
                                                    size="large"
                                                    disabled={
                                                        store.viewMode ||
                                                        store.allDisabled.PaoRZbokFWJ
                                                    }
                                                />
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </Card>
            </Form>

            <Drawer
                title="Printable Columns"
                placement="right"
                closable={false}
                onClose={() => setDrawerVisible(false)}
                visible={drawerVisible}
                width={512}
            >
                <List
                    itemLayout="horizontal"
                    dataSource={store.availablePrintDataElements}
                    renderItem={(item: any) => (
                        <List.Item>
                            <List.Item.Meta
                                avatar={
                                    <Checkbox
                                        checked={item.selected}
                                        onChange={store.includePrintColumns(
                                            item.id
                                        )}
                                    />
                                }
                                title={item.name}
                            />
                        </List.Item>
                    )}
                />
            </Drawer>
        </div>
    );
});
