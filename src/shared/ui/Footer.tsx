import { GitHubLogoIcon, HeartIcon } from '@radix-ui/react-icons'
import browser from 'webextension-polyfill'
import { GITHUB_URL, SUPPORT_URL } from '@/shared/links'

/** Shared popup/options footer: version + project links. */
export function Footer() {
  return (
    <footer className="app-footer">
      <span>v{browser.runtime.getManifest().version}</span>
      <div className="footer-links">
        <a href={GITHUB_URL} target="_blank" rel="noreferrer">
          <GitHubLogoIcon /> GitHub
        </a>
        <a href={SUPPORT_URL} target="_blank" rel="noreferrer">
          <HeartIcon /> Support
        </a>
      </div>
    </footer>
  )
}
