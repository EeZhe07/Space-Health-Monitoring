async function startScenario(page, scenario = 'C') {
  await page.getByRole('button', { name: 'Demo setup', exact: true }).click()
  await page.getByLabel('Choose a setup', { exact: true }).selectOption(scenario)
  await page.getByRole('button', { name: 'Start selected setup', exact: true }).click()
  await page.getByRole('heading', { name: 'Demo setup', exact: true }).waitFor({ state: 'hidden' })
}
module.exports = { startScenario }
