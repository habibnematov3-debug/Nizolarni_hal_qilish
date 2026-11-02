import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createTheme, MantineProvider } from '@mantine/core'
import './styles.css'
import '@mantine/core/styles.css'
import App from './App'

const theme = createTheme({
  fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  headings: { fontFamily: 'inherit' },
  primaryColor: 'teal',
  defaultRadius: 'md',
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="light">
      <App />
    </MantineProvider>
  </StrictMode>,
)
