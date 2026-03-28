import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js"
import type { AgentInfo } from "./types"

const BUTTON_ID_PREFIX = "agent_switch_"
const BUTTONS_PER_ROW = 5
const MAX_ROWS = 5
const MAX_CUSTOM_ID_LENGTH = 100

function hexToDecimal(hex: string): number {
  return parseInt(hex.replace("#", ""), 16)
}

export function buildAgentEmbed(
  agentName: string,
  color?: string,
  status?: string,
): EmbedBuilder {
  const embed = new EmbedBuilder().setTitle(agentName)

  if (color) {
    embed.setColor(hexToDecimal(color))
  }

  if (status) {
    embed.setDescription(status)
  }

  return embed
}

export function buildAgentButtons(
  agents: AgentInfo[],
  currentAgent: string,
): ActionRowBuilder<ButtonBuilder>[] {
  if (agents.length === 0) return []

  const cappedAgents = agents.slice(0, MAX_ROWS * BUTTONS_PER_ROW)

  const rows: ActionRowBuilder<ButtonBuilder>[] = []

  for (let i = 0; i < cappedAgents.length; i += BUTTONS_PER_ROW) {
    const rowAgents = cappedAgents.slice(i, i + BUTTONS_PER_ROW)
    const row = new ActionRowBuilder<ButtonBuilder>()

    for (const agent of rowAgents) {
      const customId = `${BUTTON_ID_PREFIX}${agent.name}`.slice(
        0,
        MAX_CUSTOM_ID_LENGTH,
      )

      const button = new ButtonBuilder()
        .setCustomId(customId)
        .setLabel(agent.name)
        .setStyle(agent.name === currentAgent ? ButtonStyle.Primary : ButtonStyle.Secondary)

      row.addComponents(button)
    }

    rows.push(row)
  }

  return rows
}

export function parseButtonInteraction(customId: string): string | null {
  if (!customId.startsWith(BUTTON_ID_PREFIX)) return null
  const agentName = customId.slice(BUTTON_ID_PREFIX.length)
  return agentName || null
}
