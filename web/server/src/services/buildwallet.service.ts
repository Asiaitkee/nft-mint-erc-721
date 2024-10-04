import { Wallets } from 'fabric-network';
import FabricCAServices from 'fabric-ca-client';
import fs from 'fs';
import path from 'path';

export async function Enroll(user_id: string): Promise<void> {
    try {
        // Load the network configuration
        const ccpPath = path.resolve(__dirname, '..', '..', '..', '..', 'network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
        console.log('ccpPath',ccpPath)
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
        console.log('ccp',ccp)
        // Create a new CA client for interacting with the CA
        const caURL = ccp.certificateAuthorities['ca.org1.example.com'].url;
        const ca = new FabricCAServices(caURL);

        // Create a new file system-based wallet for managing identities
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check if the user is already enrolled
        const userIdentity = await wallet.get(user_id);
        if (userIdentity) {
            console.log(`An identity for the user ${user_id} already exists in the wallet`);
            return;
        }

        // Check if the admin user is enrolled
        let adminIdentity = await wallet.get('admin');
        if (!adminIdentity) {
            console.log('Admin identity not found. Enrolling admin...');
            await enrollAdmin();  // Call the admin enrollment function
            adminIdentity = await wallet.get('admin');
        }

        // Ensure adminIdentity is not undefined after re-fetching
        if (!adminIdentity) {
            throw new Error('Failed to retrieve the admin identity after enrollment.');
        }

        // Build a user object for authenticating with the CA
        const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity, 'admin');

        // Register the user, enroll the user, and import the new identity into the wallet
        const secret = await ca.register({
            affiliation: 'org1.department1',
            enrollmentID: user_id,
            role: 'client',
        }, adminUser);
        const enrollment = await ca.enroll({
            enrollmentID: user_id,
            enrollmentSecret: secret,
        });
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: 'Org1MSP',
            type: 'X.509',
        };
        await wallet.put(user_id, x509Identity);
        console.log(`Successfully registered and enrolled user ${user_id} and imported it into the wallet`);
    } catch (error) {
        const err = error as Error;
        console.error(`Failed to register user ${user_id}: ${error}`);
        throw new Error(`Failed to enroll user: ${err.message}`);
    }
}


async function enrollAdmin(): Promise<void> {
    try {
        // Load the network configuration
        const ccpPath = path.resolve(__dirname, '..', '..', '..', '..', 'network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Create a new CA client for interacting with the CA
        const caURL = ccp.certificateAuthorities['ca.org1.example.com'].url;
        const ca = new FabricCAServices(caURL);

        // Create a new file system-based wallet for managing identities
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the admin user
        const adminIdentity = await wallet.get('admin');
        if (adminIdentity) {
            console.log('An identity for the admin user "admin" already exists in the wallet');
            return;
        }

        // Enroll the admin user and import the new identity into the wallet
        const enrollment = await ca.enroll({
            enrollmentID: 'admin',
            enrollmentSecret: 'adminpw',  // This must match the admin credentials in your configuration
        });
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: 'Org1MSP',
            type: 'X.509',
        };
        await wallet.put('admin', x509Identity);
        console.log('Successfully enrolled admin user "admin" and imported it into the wallet');
    } catch (error) {
        const err = error as Error;
        console.error(`Failed to enroll admin user "admin": ${error}`);
        throw new Error(`Failed to enroll admin: ${err.message}`);
    }
}

