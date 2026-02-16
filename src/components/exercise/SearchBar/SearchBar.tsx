import { useExerciseContext } from '@/components/providers/exerciseContext';
import './_searchBar.scss';

export const SearchBar = () => {
    const { searchTerm, setSearchTerm } = useExerciseContext();

    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
    };

    return (
        <div className='searchBar'>
            <input
                type='text'
                placeholder='Buscar Ejercicio...'
                value={searchTerm}
                onChange={handleSearch}
            />
        </div>
    )
}