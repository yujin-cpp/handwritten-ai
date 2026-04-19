type GradingResult = {
  objectiveScoreLog: string;
  essayScoreLog: string;
  feedback: string;
};

let store: GradingResult = {
  objectiveScoreLog: "",
  essayScoreLog: "",
  feedback: "",
};

export const setGradingResult = (data: GradingResult) => {
  store = data;
};

export const getGradingResult = () => store;
