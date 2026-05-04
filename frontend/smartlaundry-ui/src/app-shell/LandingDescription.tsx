import { useI18n } from "./i18n-context";

export function LandingDescription() {
  const { t } = useI18n();

  return (
    <div className="rounded-2xl border border-gray-200 bg-white/90 dark:bg-gray-900/80 dark:border-gray-800 shadow-sm p-6 md:p-8">
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">
            {t("landingOverviewTitle")}
          </h2>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {t("landingOverviewIntro")}
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {t("landingOverviewAlt")}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">
              {t("landingAdminTitle")}
            </h3>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300 list-disc list-inside">
              <li>{t("landingAdminItem1")}</li>
              <li>{t("landingAdminItem2")}</li>
              <li>{t("landingAdminItem3")}</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold">
              {t("landingUserTitle")}
            </h3>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300 list-disc list-inside">
              <li>{t("landingUserItem1")}</li>
              <li>{t("landingUserItem2")}</li>
              <li>{t("landingUserItem3")}</li>
              <li>{t("landingUserItem4")}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LandingDescription;
