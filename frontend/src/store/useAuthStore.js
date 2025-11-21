import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";


export const useAuthStore = create((set) => ({
  authUser: null,
  isCheckingAuth: true,
  isSigningUp: false,

  checkAuth: async () => {
    try {
      const response = await axiosInstance.get("auth/check");
      set({ authUser: response.data });
    } catch (error) {
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data.user });
      
       toast.success("Signup successful"); //toast notification - install react-toastify or sonner

    } catch (error) {
        toast.error("Signup failed"); //toast notification
    } finally {
      set({ isSigningUp: false });
    }
  },
}));
