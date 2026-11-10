package com.anusha.resume_builder.ats.llm;

import com.fasterxml.jackson.databind.JsonNode;

import java.io.IOException;

/** Minimal "give me JSON" interface so the analysis pipeline can be tested without a network. */
public interface LlmClient {

    boolean isAvailable();

    /**
     * Sends a system instruction and a prompt and returns the parsed JSON object the model produced.
     *
     * @throws IOException if no model produced valid JSON
     */
    JsonNode generateJson(String systemInstruction, String prompt) throws IOException;
}