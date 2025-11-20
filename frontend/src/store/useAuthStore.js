import { create } from "zustand";


export const useAuthStore = create((set) => ({
  authUser: { name: "jhon", _id: "123", age: 20 },
  isLoggedIn: false,

  login: () => {
    console.log("we just logged in");
  }
}));
