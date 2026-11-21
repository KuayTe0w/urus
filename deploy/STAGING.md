# Isolated staging and preview

The current Firebase project `urus-ba98e` is a test project. Preview uses a
separate Cloud SQL database and Cloud Run service `urus-api-staging` in
`asia-southeast1`, but shares Firebase Authentication with the current test
application. Use synthetic data only. A future production application must use
a separate Firebase project, Authentication and database. Add preview domains
to Firebase Authentication authorized domains when required.

In GitHub repository settings, set variable `URUS_STAGING_PROJECT_ID` to the
test project ID and secret `FIREBASE_STAGING_SERVICE_ACCOUNT` to credentials
for a dedicated deployment identity. Firebase Hosting permissions may also
allow publishing the live channel in this shared project: treat this credential
as privileged and do not reuse a broad migration credential. Prefer short-lived workload identity
federation for production automation; never commit credentials. The preview job
runs only for same-repository pull requests when the staging variable is set.
Fork pull requests must be reviewed and tested by a maintainer in a trusted
branch before a preview can use secrets. The workflow never automatically
publishes a pull request to production.

The separate preview database is on the same Cloud SQL instance, and the
preview service uses its own runtime identity and database user. Authentication
is shared, so preview accounts also exist in the current test project. Cloud
resources may incur charges. Preview Hosting alone is not a security boundary.
