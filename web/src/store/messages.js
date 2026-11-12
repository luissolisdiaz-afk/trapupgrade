import { createSlice } from '@reduxjs/toolkit';

const { reducer, actions } = createSlice({
  name: 'messages',
  initialState: {
    messages: [],
  },
  reducers: {
    push(state, action) {
      const text = (item) => (typeof item === 'string' ? item : item?.message);
      // the same error repeated while it is already on screen only adds noise
      if (state.messages.some((item) => text(item) === text(action.payload))) {
        return;
      }
      state.messages.push(action.payload);
    },
    pop(state) {
      if (state.messages.length) {
        state.messages.shift();
      }
    },
  },
});

export { actions as messagesActions };
export { reducer as messagesReducer };
