import { defineAction } from "astro:actions";
import { z } from "astro:schema";
import api from "../lib/clients";
import { orgsActions } from "./orgs";
import { projectsActions } from "./projects";

export const server = {
	projectsActions,
	orgsActions,
};
