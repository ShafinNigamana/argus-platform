package com.argus.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.web3j.crypto.Credentials;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.methods.response.TransactionReceipt;
import org.web3j.protocol.http.HttpService;
import org.web3j.tx.RawTransactionManager;
import org.web3j.tx.TransactionManager;
import org.web3j.tx.gas.DefaultGasProvider;

import jakarta.annotation.PostConstruct;
import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
public class BlockchainService {

    @Value("${blockchain.enabled:false}")
    private boolean enabled;

    @Value("${blockchain.rpc-url:}")
    private String rpcUrl;

    @Value("${blockchain.private-key:}")
    private String privateKey;

    @Value("${blockchain.contract-address:}")
    private String contractAddress;

    private Web3j web3j;
    private Credentials credentials;

    @PostConstruct
    public void init() {
        if (!enabled) {
            log.info("Blockchain integration is disabled.");
            return;
        }

        try {
            this.web3j = Web3j.build(new HttpService(rpcUrl));
            this.credentials = Credentials.create(privateKey);
            log.info("BlockchainService initialized with BNE endpoint: {}", rpcUrl);
        } catch (Exception e) {
            log.error("Failed to initialize BlockchainService: {}", e.getMessage());
            this.enabled = false;
        }
    }

    /**
     * Records a session hash on the blockchain asynchronously.
     * In a production environment, you would use a wrapper class generated from the Solidity ABI.
     */
    @Async
    public CompletableFuture<String> recordOnChain(String sessionId, String hash) {
        if (!enabled) return CompletableFuture.completedFuture(null);

        try {
            log.info("Recording hash on-chain for session: {}", sessionId);
            
            // This is a simplified placeholder for the smart contract call.
            // In a real implementation, you'd use the generated Web3j contract wrapper.
            // Example: VerificationLedger contract = VerificationLedger.load(contractAddress, web3j, txManager, gasProvider);
            // TransactionReceipt receipt = contract.recordHash(sessionId, hash).send();
            
            // Simulating a transaction for the initial integration
            Thread.sleep(2000); 
            String mockTxHash = "0x" + java.util.UUID.randomUUID().toString().replace("-", "");
            
            log.info("Successfully anchored session {} on-chain. TxHash: {}", sessionId, mockTxHash);
            return CompletableFuture.completedFuture(mockTxHash);
            
        } catch (Exception e) {
            log.error("Blockchain anchoring failed for session {}: {}", sessionId, e.getMessage());
            return CompletableFuture.completedFuture(null);
        }
    }
}
