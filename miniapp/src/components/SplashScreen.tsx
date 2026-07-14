import { SpinLoading } from "antd-mobile";

export function SplashScreen() {
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <SpinLoading style={{ "--size": "36px" }} />
    </div>
  );
}
