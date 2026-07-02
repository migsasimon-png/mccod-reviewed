import { observer } from "mobx-react";
import React, { useEffect, useState } from "react";
import { DataEntryForm } from "./components/Form";
import { HeaderBar } from "@dhis2/ui-widgets";
import { useDataEngine } from "@dhis2/app-runtime";
import englishDefault from "./assets/english.json";
import englishMeta from "./components/LanguageConfigPage/fullMetaData.json";
import { store } from "./Store";
import { OrgUnitTree } from "./components/OrgUnitTree";
import { StoreContext } from "./Context";
import { EventList } from "./components/EventList";
import LanguageConfigPage from "./components/LanguageConfigPage";
import ApiConfigPage from "./components/ApiConfigPage";
import { Home } from "./components/Home";
import { DynamicForm } from "./components/DynamicForm";

export const App = observer(() => {
  const engine = useDataEngine();
  store.setEngine(engine);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);


  // Legacy MCCOD bootstrap — only when embedded from another app, not on a
  // normal browser visit (stale mcodtemp in localStorage must not hijack home).
  useEffect(() => {
    const search = `${window.location.search}${window.location.hash}`;
    const embedded =
      window !== window.parent || /iframe_edit=true/.test(search);
    if (embedded) {
      store.openModule("records");
    }
  }, []);

  const fetchOrgs = async () => {
    setFetching(true);
    try {
      console.log("Fetching orgs...");
      await Promise.all([store.loadUserOrgUnits()]);
    } catch (error) {
      console.log({ error });
    } finally {
      setFetching(false);
    }
  };
  useEffect(() => {
    if (store?.organisationUnits?.length || store?.fetchingOrgUnits) return;
    fetchOrgs();
  }, []);

  useEffect(() => {
    if (store?.organisationUnits?.length || store?.fetchingOrgUnits) return;
    async function test() {
      setFetching(true);
      try {
        console.log("Fetching orgs...");
        await Promise.all([
          store.initApp(),
          store.loadUserOrgUnits()
        ]);
      } catch (error) {
        console.log({ error })
      } finally {
        setFetching(false);
      }

    }
    test();
  }, []);

  useEffect(() => {
    console.log(
      "store.currentPage is ",
      store.currentPage,
      store.organisationUnits
    );
  }, [store.organisationUnits]);

  const goToEvents = () => {
    store.showEvents();
  };

  const getActiveLanguage = async () => {
    const activeLanguage = await store.getActiveLanguage();
    console.log("activeLanguage found is ", activeLanguage);
    if (!!activeLanguage?.language) {
      // Set the UI values
      console.log("Setting active language now");
      store.setActiveLanguage({ lang: activeLanguage.language });
      store.setICDLang(activeLanguage.ICDLang ?? "en");
    } else {
      // Post a new default language as English and set it as the active language.
      store.setActiveLanguage({ lang: englishDefault });
      Promise.all([
        store.saveActiveLanguage(
          englishDefault?.LanguageName,
          englishDefault,
          activeLanguage?.ICDLang ?? "en"
        ),
        store.postLanguageMeta(englishMeta),
        store.saveNewLang(
          englishDefault?.LanguageName,
          englishDefault,
          englishMeta
        ),
      ]);
    }
  };

  const loadApp = async () => {
    setLoading(true);

    await Promise.all([getActiveLanguage(), store.initApp()]);
    setLoading(false);
  };

  useEffect(() => {
    console.log("loading app...")
    loadApp();
  }, []);



  return (
    <StoreContext.Provider value={store}>
      {/* <HeaderBar
        appName={" Medical Certificate of Cause of Death"}
        style={{
          left: 0,
          position: "fixed",
          top: 0,
          width: "100%",
          zIndex: 1000,
        }}
      /> */}
      {store.activeModule === "home" ? (
        <Home />
      ) : store.activeModule === "mdr" ||
        store.activeModule === "pdr" ||
        store.activeModule === "cdr" ||
        store.activeModule === "mccod" ? (
        <DynamicForm />
      ) : store.currentPage === "4" ? (
        <div className="p-2">
          <ApiConfigPage />
        </div>
      ) : store.currentPage === "2" ? (
        <div className="p-2">
          <LanguageConfigPage next={goToEvents} />
        </div>
      ) : (
        <div className="p-2">
          {window === window.parent && (
            <div className="mccod-topbar">
              <button className="mccod-home-link" onClick={store.goHome}>
                ← All forms
              </button>
            </div>
          )}
          {store.currentPage === "1" ? (
            <OrgUnitTree loading={loading || fetching} fetching={fetching} />
          ) : (
            <></>
          )}
          {/* <DataEntryForm /> */}
          {store.currentPage === "3" ? <DataEntryForm /> : <EventList />}
        </div>
      )}
    </StoreContext.Provider>
  );
});
