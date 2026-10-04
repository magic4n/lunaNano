// Type declarations for @material/web custom elements in React JSX

import React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'md-filled-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        disabled?: boolean;
        href?: string;
        target?: string;
      }, HTMLElement>;
      'md-outlined-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        disabled?: boolean;
      }, HTMLElement>;
      'md-text-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        disabled?: boolean;
      }, HTMLElement>;
      'md-elevated-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        disabled?: boolean;
      }, HTMLElement>;
      'md-icon-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        disabled?: boolean;
        selected?: boolean;
        toggle?: boolean;
      }, HTMLElement>;
      'md-filled-icon-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        disabled?: boolean;
        selected?: boolean;
        toggle?: boolean;
      }, HTMLElement>;
      'md-icon': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'md-slider': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        min?: number;
        max?: number;
        value?: number;
        step?: number;
        labeled?: boolean;
        disabled?: boolean;
      }, HTMLElement>;
      'md-switch': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        selected?: boolean;
        disabled?: boolean;
        icons?: boolean;
      }, HTMLElement>;
      'md-checkbox': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        checked?: boolean;
        disabled?: boolean;
        indeterminate?: boolean;
      }, HTMLElement>;
      'md-radio': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        checked?: boolean;
        disabled?: boolean;
        name?: string;
        value?: string;
      }, HTMLElement>;
      'md-linear-progress': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        value?: number;
        max?: number;
        indeterminate?: boolean;
        buffer?: number;
      }, HTMLElement>;
      'md-circular-progress': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        value?: number;
        max?: number;
        indeterminate?: boolean;
        fourColor?: boolean;
      }, HTMLElement>;
      'md-outlined-text-field': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        label?: string;
        value?: string;
        placeholder?: string;
        type?: string;
        disabled?: boolean;
        rows?: number;
        supportingText?: string;
        error?: boolean;
        errorText?: string;
      }, HTMLElement>;
      'md-filled-text-field': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        label?: string;
        value?: string;
        placeholder?: string;
        type?: string;
        disabled?: boolean;
        rows?: number;
      }, HTMLElement>;
      'md-tabs': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        activeTabIndex?: number;
      }, HTMLElement>;
      'md-primary-tab': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        active?: boolean;
      }, HTMLElement>;
      'md-secondary-tab': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        active?: boolean;
      }, HTMLElement>;
      'md-dialog': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        open?: boolean;
        quick?: boolean;
      }, HTMLElement>;
      'md-divider': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        inset?: boolean;
      }, HTMLElement>;
      'md-chip-set': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'md-filter-chip': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        label?: string;
        selected?: boolean;
        disabled?: boolean;
      }, HTMLElement>;
      'md-assist-chip': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        label?: string;
        disabled?: boolean;
      }, HTMLElement>;
      'md-elevation': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'md-ripple': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}
