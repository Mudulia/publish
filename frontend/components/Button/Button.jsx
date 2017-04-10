'use strict'

import {h, Component} from 'preact'
import proptypes from 'proptypes'

import Style from 'lib/Style'
import styles from './Button.css'

/**
 * A simple call-to-action button.
 */
export default class Button extends Component {
  static propTypes = {
    /**
     * Colour accent.
     */
    accent: proptypes.oneOf([
      'data',
      'destruct',
      'inherit',
      'neutral',
      'save',
      'system'
    ]),

    /**
     * The text/elements to be rendered inside the button.
     */
    children: proptypes.node,

    /**
     * Classes to append to the button element.
     */
    className: proptypes.string,

    /**
     * Whether the button is disabled.
     */
    disabled: proptypes.bool,

    /**
     * When present, the button will be rendered as an `a` element with the given
     * href.
     */
    href: proptypes.string,

    /**
     * Whether the button is part of a group of buttons, and which position this particular button takes in the group. This is used to collapse the border-radius accordingly.
     */
    inGroup: proptypes.oneOf(['left', 'middle', 'right']),

    /**
     * Callback to be executed when the button is clicked.
     */
    onClick: proptypes.func,

    /**
     * The size variation of the button.
     */
    size: proptypes.oneOf(['normal', 'small']),

    /**
     * Type/function of the button. When set to `mock`, a static element will be
     * rendered (as a `span`).
     */
    type: proptypes.oneOf(['button', 'mock', 'submit'])
  }

  static defaultProps = {
    accent: 'neutral',
    className: '',
    disabled: false,
    size: 'normal',
    type: 'button'
  }

  constructor(props) {
    super(props)

    this.optionsExpanded = false
  }

  render() {
    const {
      accent, 
      className, 
      children, 
      disabled,
      href,
      inGroup, 
      onClick,
      size,
      type
    } = this.props
    const buttonStyle = new Style(styles, 'button')

    buttonStyle.add(`button-${accent}`)
      .add(`button-in-group-${inGroup}`)
      .addIf('button-mock', type === 'mock')
      .addIf(`button-${size}`, size !== 'normal')
      .addResolved(className)

    if (type === 'mock') {
      return (
        <span class={buttonStyle.getClasses()}>{children}</span>
      )
    }

    if (href) {
      return (
        <a
          class={buttonStyle.getClasses()}
          href={href}
        >{children}</a>
      )
    }

    return (
      <button
        class={buttonStyle.getClasses()}
        disabled={disabled}
        onClick={onClick}
        type={type}
      >{children}</button>
    )
  }
}
