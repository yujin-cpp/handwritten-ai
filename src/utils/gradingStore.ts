type GradingResult = {
  essayScoreLog: string;
  feedback: string;
};

let store: GradingResult = {
  essayScoreLog: "",
  feedback: "",
};

export const setGradingResult = (data: GradingResult) => {
  store = data;
};

export const getGradingResult = () => store;
