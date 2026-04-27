type GradingResult = {
  essayScoreLog: string;
  objectiveScoreLog: string;
  feedback: string;
};

let store: GradingResult = {
  essayScoreLog: "",
  objectiveScoreLog: "",
  feedback: "",
};

export const setGradingResult = (data: GradingResult) => {
  store = data;
};

export const getGradingResult = () => store;
