import { defineAction } from "astro:actions";
import { z } from "astro:schema";
import api from "../lib/clients";
import { orgsActions } from "./orgs";
import { projectsActions } from "./projects";
import { usersActions } from "./users";

export const server = {
	projectsActions,
	orgsActions,
	usersActions,
};
