import React from 'react';
import reactForm from 'app/utils/ReactForm';

import { render, fireEvent } from '../../../test/unit/tools';
import { BeneficiarySelector, validateBeneficiaries } from './BeneficiarySelector';

require('app/Translator');

class FormWrapper extends React.Component {
    constructor() {
        super();
        this.state = {};
        reactForm({
            fields: ['beneficiaries'],
            initialValues: { beneficiaries: [] },
            validation: () => {
                return {
                    beneficiaries: true,
                };
            },
            instance: this,
            name: 'testwrapper',
        });
    }

    render() {
        const { beneficiaries } = this.state;
        return <BeneficiarySelector {...beneficiaries.props} username="testuser" following={['testfollowing']} />;
    }
}

describe('BeneficiarySelector', () => {
    it('it should add, set and remove beneficiary', () => {
        const { container } = render(<FormWrapper />);

        expect(container.querySelectorAll('input.input-group-field')).toHaveLength(1);

        const remainingPercentInput = container.querySelector('input#remainingPercent');
        expect(remainingPercentInput).toHaveAttribute('value', '100');

        // add beneficiary
        const addButton = container.querySelector('a#add');
        fireEvent.click(addButton);
        expect(container.querySelectorAll('input.input-group-field')).toHaveLength(2);

        // add name and percent
        const percentInput = container.querySelector('input#percent');
        fireEvent.change(percentInput, { target: { value: 20 } });
        expect(percentInput).toHaveAttribute('value', '20');
        expect(remainingPercentInput).toHaveAttribute('value', '80');

        const userInput = container.querySelector('input#user');
        fireEvent.change(userInput, { target: { value: 'testuser2' } });
        expect(userInput).toHaveAttribute('value', 'testuser2');

        // remove beneficiary
        const removeButton = container.querySelector('a#remove');
        fireEvent.click(removeButton);
        expect(container.querySelectorAll('input.input-group-field')).toHaveLength(1);
        expect(remainingPercentInput).toHaveAttribute('value', '100');
    });
});

describe('BeneficiarySelector_maxEntries', () => {
    it('it should hide add after 8 entries', () => {
        const { container } = render(<FormWrapper />);

        expect(container.querySelectorAll('input.input-group-field')).toHaveLength(1);

        const remainingPercentInput = container.querySelector('input#remainingPercent');
        expect(remainingPercentInput).toHaveAttribute('value', '100');

        // add beneficiary 8 times
        const addButton = container.querySelector('a#add');
        for (let i = 0; i < 8; i += 1) {
            fireEvent.click(addButton);
        }
        expect(container.querySelectorAll('input.input-group-field')).toHaveLength(9);
        expect(addButton).toHaveAttribute('hidden');
    });
});

describe('BeneficiarySelector_validate', () => {
    it('beneficiary size exceeded', () => {
        const beneficiaries = [];
        for (let i = 0; i < 9; i += 1) {
            beneficiaries[i] = { username: 'abc' + i, percent: 1 };
        }

        // @TODO update this test after fixing loading of translations into unit tests
        expect(validateBeneficiaries('', beneficiaries, true)).toContain('exceeds_max_beneficiaries');
    });

    it('beneficiary cannot have duplicate', () => {
        const beneficiaries = [];
        for (let i = 0; i < 2; i += 1) {
            beneficiaries[i] = { username: 'abc', percent: 1 };
        }
        expect(validateBeneficiaries('', beneficiaries, true)).toContain('duplicate');
    });

    it('beneficiary cannot be self', () => {
        const beneficiaries = [{ username: 'abc', percent: 1 }];
        expect(validateBeneficiaries('abc', beneficiaries, true)).toContain('self');
    });

    it('beneficiary user missing when optional no error', () => {
        const beneficiaries = [{ username: '', percent: 0 }];
        expect(validateBeneficiaries('a', beneficiaries, false)).toBeFalsy();
    });

    it('beneficiary percent missing when optional no error', () => {
        const beneficiaries = [{ username: 'abc', percent: 0 }];
        expect(validateBeneficiaries('', beneficiaries, false)).toBeFalsy();
    });

    it('beneficiary percent too low when required', () => {
        const beneficiaries = [{ username: 'abc', percent: 0 }];
        expect(validateBeneficiaries('', beneficiaries, true)).toContain('percent');
    });

    it('beneficiary percent too high', () => {
        const beneficiaries = [{ username: 'abc', percent: 101 }];
        expect(validateBeneficiaries('', beneficiaries, true)).toContain('percent');
    });

    it('beneficiary percent sum too high', () => {
        const beneficiaries = [{ username: 'abc', percent: 50 }, { username: 'def', percent: 51 }];
        expect(validateBeneficiaries('', beneficiaries, true)).toContain('percent');
    });
});
