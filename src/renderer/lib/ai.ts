export const generateCommitMessage = async (diff: string): Promise<string> => {
  return await window.api.aiGenerateCommitMessage(diff);
};

export const explainLog = async (log: string): Promise<string> => {
  return await window.api.aiExplainLog(log);
};
