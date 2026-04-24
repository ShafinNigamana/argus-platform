# 🔐 Argus Blockchain Activation Guide (Layman Terms)

Congratulations! Your backend is live in the cloud. Right now, it's working in "Normal Mode." To turn on the **Blockchain Trust Layer** (the part that makes your results tamper-proof), you just need to create your "Digital Stamp."

Follow these 3 easy parts to finish your project!

---

## Part 1: Create your "Digital Stamp" (GCP KMS)
Google Cloud KMS is like a high-security safe that holds a "Stamp" (a Private Key). Every time someone is verified, Argus will use this stamp to sign the result.

1.  **Open the Google Cloud Console** and search for **"KMS"** or **"Key Management Service"**.
2.  **Create a Key Ring**: 
    *   Click **Create Key Ring**.
    *   Name it: `argus-ring`.
    *   Location: Choose `us-central1` (same as your app).
3.  **Create a Key**:
    *   Name it: `argus-key`.
    *   **Purpose**: Select **Asymmetric Signing**.
    *   **Algorithm**: Select **Elliptic Curve P-256 - SHA256 digest** (this is the standard secure choice).
    *   Click **Create**.

---

## Part 2: Get your "Key Address"
Now you need to tell the app exactly which "Stamp" to use.

1.  Inside your `argus-key` page, look for the **"Resource Name"** (it looks like a long address).
2.  It will look something like this:
    `projects/argus-gsc-26/locations/us-central1/keyRings/argus-ring/cryptoKeys/argus-key`
3.  **Copy this entire string.** You will need it in the next step.

---

## Part 3: Turn the Blockchain "ON"
We need to flip the switch and give the app its new address.

1.  Go to **Cloud Run** in your console.
2.  Click on your service: **argus-backend**.
3.  Click the button at the top: **"Edit & Deploy New Revision"**.
4.  Scroll down to the **"Variables & Secrets"** tab.
5.  Add these two entries:
    *   **Name**: `GCP_LEDGER_ENABLED` | **Value**: `true`
    *   **Name**: `GCP_KMS_KEY_NAME` | **Value**: *(Paste that long address you copied in Part 2)*
6.  Scroll to the bottom and click **Deploy**.

---

### 🎉 What happens next?
Once the deployment finishes:
1.  Every time a user finishes a verification, the app will automatically reach out to your "Digital Stamp."
2.  It will mathematically link that result to the one before it.
3.  The final "Signed Proof" will be saved forever in your **Firestore Database**.

**You now have a 100% Google-powered, Free-Tier Blockchain!**
