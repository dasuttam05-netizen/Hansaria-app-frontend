import React, { useState } from "react";

import axios from "axios";

import { useNavigate } from "react-router-dom";

import { hasAnyPermission, hasPermission, saveSession } from "../utils/auth";

function resolveLandingPath(user) {
  if (hasPermission(user, "dashboard.view")) {
    return "/dashboard";
  }

  if (
    hasAnyPermission(user, [
      "expense.entry",
      "expense.view",
      "expense.create",
      "expense.edit",
      "expense.delete",
    ])
  ) {
    return "/expenses";
  }

  if (
    hasAnyPermission(user, [
      "inward.view",
      "inward.create",
      "inward.edit",
      "inward.delete",
    ])
  ) {
    return "/inward";
  }

  if (
    hasAnyPermission(user, [
      "outward.view",
      "outward.create",
      "outward.edit",
      "outward.delete",
    ])
  ) {
    return "/outward";
  }

  if (hasPermission(user, "report.inward")) {
    return "/inward-report";
  }

  return "/dashboard";
}

export default function LoginPage() {

  const [username, setUsername] =
    useState("");

  const [password, setPassword] =
    useState("");

  const navigate =
    useNavigate();

  const handleLogin =
    async (e) => {

      e.preventDefault();

      try {

        const res =
          await axios.post(
            "https://hansaria-app-backend.onrender.com/auth/login",
            {
              username,
              password,
            }
          );

        const savedUser = saveSession(
          res.data.token,
          res.data.user
        );

        navigate(
          resolveLandingPath(savedUser)
        );

      } catch (err) {

        alert(
          "Login failed: " +
          (
            err.response?.data
              ?.error ||
            "Please try again"
          )
        );

      }

    };

  return (

    <div
      style={{
        padding: "40px",
      }}
    >

      <h2>
        Warehouse Login
      </h2>

      <form
        onSubmit={handleLogin}
      >

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) =>
            setUsername(
              e.target.value
            )
          }
        />

        <br />
        <br />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) =>
            setPassword(
              e.target.value
            )
          }
        />

        <br />
        <br />

        <button type="submit">
          Login
        </button>

      </form>

    </div>

  );

}
