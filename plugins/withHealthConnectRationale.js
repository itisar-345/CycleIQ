/**
 * Health Connect shows a "privacy policy" link in its permission dialog. Google Play requires
 * that link to open the app's privacy policy, but react-native-health-connect points it at
 * MainActivity, which opens the home screen.
 *
 * This plugin adds HealthPermissionsRationaleActivity, which forwards to cycleiq://privacy,
 * and moves both rationale entry points (the Android 13- intent filter and the Android 14+
 * ViewPermissionUsageActivity alias) onto it. List it just BEFORE "react-native-health-connect":
 * manifest mods run in reverse plugin order, so this one then runs after it.
 */
const fs = require("fs");
const path = require("path");
const { AndroidConfig, withAndroidManifest, withDangerousMod } = require("expo/config-plugins");

const RATIONALE_ACTION = "androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE";
const ACTIVITY = ".HealthPermissionsRationaleActivity";
const ALIAS = "ViewPermissionUsageActivity";

const activitySource = (pkg, scheme) => `package ${pkg}

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle

/** Opens the in-app privacy policy when Health Connect asks why we want access. */
class HealthPermissionsRationaleActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    startActivity(
      Intent(Intent.ACTION_VIEW, Uri.parse("${scheme}://privacy"))
        .setPackage(packageName)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    )
    finish()
  }
}
`;

const hasRationaleAction = (filter) => (filter.action || []).some((a) => a.$["android:name"] === RATIONALE_ACTION);

const withRationaleManifest = (config) =>
  withAndroidManifest(config, (config) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    const main = AndroidConfig.Manifest.getMainActivityOrThrow(config.modResults);
    main["intent-filter"] = (main["intent-filter"] || []).filter((f) => !hasRationaleAction(f));

    app.activity = (app.activity || []).filter((a) => a.$["android:name"] !== ACTIVITY);
    app.activity.push({
      $: { "android:name": ACTIVITY, "android:exported": "true", "android:theme": "@android:style/Theme.Translucent.NoTitleBar", "android:excludeFromRecents": "true" },
      "intent-filter": [{ action: [{ $: { "android:name": RATIONALE_ACTION } }] }],
    });

    app["activity-alias"] = (app["activity-alias"] || []).filter((a) => a.$["android:name"] !== ALIAS);
    app["activity-alias"].push({
      $: {
        "android:name": ALIAS,
        "android:exported": "true",
        "android:targetActivity": ACTIVITY,
        "android:permission": "android.permission.START_VIEW_PERMISSION_USAGE",
      },
      "intent-filter": [{
        action: [{ $: { "android:name": "android.intent.action.VIEW_PERMISSION_USAGE" } }],
        category: [{ $: { "android:name": "android.intent.category.HEALTH_PERMISSIONS" } }],
      }],
    });
    return config;
  });

const withRationaleActivitySource = (config) =>
  withDangerousMod(config, ["android", async (config) => {
    const pkg = config.android?.package;
    if (!pkg) throw new Error("withHealthConnectRationale: set expo.android.package in app.json");
    const scheme = Array.isArray(config.scheme) ? config.scheme[0] : config.scheme;
    const dir = path.join(config.modRequest.platformProjectRoot, "app", "src", "main", "java", ...pkg.split("."));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "HealthPermissionsRationaleActivity.kt"), activitySource(pkg, scheme));
    return config;
  }]);

module.exports = (config) => withRationaleActivitySource(withRationaleManifest(config));
